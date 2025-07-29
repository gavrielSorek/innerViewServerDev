import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole, SubscriptionPlan } from './schemas/user.schema';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateRoleDto,
  UpdateStatusDto,
  SyncUserDto,
  UserStatsDto,
  UpdateSubscriptionDto,
} from './dto';
import { UserStatsService } from './user-stats.service';
import * as admin from 'firebase-admin';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => UserStatsService))
    private userStatsService: UserStatsService,
  ) {}

  /**
   * Create a new user or return existing one
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel
        .findOne({
          $or: [
            { email: createUserDto.email },
            { firebaseUid: createUserDto.firebaseUid },
          ],
        })
        .exec();

      if (existingUser) {
        // Update lastLoginAt
        existingUser.lastLoginAt = new Date();
        await existingUser.save();
        return existingUser.toObject();
      }

      // Create new user with default free subscription
      const createdUser = new this.userModel({
        ...createUserDto,
        role: createUserDto.role || UserRole.THERAPIST,
        subscription: SubscriptionPlan.FREE,
        lastLoginAt: new Date(),
      });
      const savedUser = await createdUser.save();
      return savedUser.toObject();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }
  }

  /**
   * Update user's subscription plan
   */
  async updateSubscription(
    userId: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<User> {
    const userDoc = await this.userModel.findOne({ firebaseUid: userId }).exec();
    
    if (!userDoc) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    userDoc.subscription = updateSubscriptionDto.subscription;
    userDoc.subscriptionUpdatedAt = new Date();
    await userDoc.save();
    
    return userDoc.toObject();
  }

  /**
   * Check if user has access to a feature based on their subscription
   */
  async checkSubscriptionAccess(
    userId: string,
    requiredPlan: SubscriptionPlan,
  ): Promise<boolean> {
    const user = await this.findOne(userId);
    
    // Define subscription hierarchy
    const planHierarchy = {
      [SubscriptionPlan.FREE]: 0,
      [SubscriptionPlan.BASIC]: 1,
      [SubscriptionPlan.PRO]: 2,
    };

    return planHierarchy[user.subscription] >= planHierarchy[requiredPlan];
  }

  /**
   * Get subscription limits for a user
   */
  async getSubscriptionLimits(userId: string): Promise<{
    maxClients: number;
    maxMeetingsPerMonth: number;
    maxFuturegraphAnalyses: number;
    canExportReports: boolean;
    canUseAdvancedFeatures: boolean;
  }> {
    const user = await this.findOne(userId);
    
    switch (user.subscription) {
      case SubscriptionPlan.FREE:
        return {
          maxClients: 5,
          maxMeetingsPerMonth: 20,
          maxFuturegraphAnalyses: 2,
          canExportReports: false,
          canUseAdvancedFeatures: false,
        };
      case SubscriptionPlan.BASIC:
        return {
          maxClients: 25,
          maxMeetingsPerMonth: 100,
          maxFuturegraphAnalyses: 10,
          canExportReports: true,
          canUseAdvancedFeatures: false,
        };
      case SubscriptionPlan.PRO:
        return {
          maxClients: -1, // unlimited
          maxMeetingsPerMonth: -1, // unlimited
          maxFuturegraphAnalyses: -1, // unlimited
          canExportReports: true,
          canUseAdvancedFeatures: true,
        };
      default:
        return this.getSubscriptionLimits(SubscriptionPlan.FREE);
    }
  }

  /**
   * Sync user from Firebase Auth
   */
  async syncFromFirebase(syncUserDto: SyncUserDto): Promise<User> {
    try {
      // Get Firebase user details
      const firebaseUser = await admin.auth().getUser(syncUserDto.firebaseUid);
      
      const userData = {
        firebaseUid: syncUserDto.firebaseUid,
        email: firebaseUser.email || syncUserDto.email,
        fullName: syncUserDto.fullName || firebaseUser.displayName || 'Unknown User',
        phoneNumber: syncUserDto.phoneNumber || firebaseUser.phoneNumber,
        profilePicture: syncUserDto.profilePicture || firebaseUser.photoURL,
      };

      // Find or create user
      let user = await this.userModel.findOne({ firebaseUid: userData.firebaseUid }).exec();
      
      if (user) {
        // Update user data
        Object.assign(user, userData);
        user.lastLoginAt = new Date();
        await user.save();
        return user.toObject();
      } else {
        // Create new user with FREE subscription
        return await this.create(userData as CreateUserDto);
      }
    } catch (error) {
      console.error('Error syncing user from Firebase:', error);
      throw new BadRequestException('Failed to sync user from Firebase');
    }
  }

  /**
   * Find all users (for managers and admins)
   */
  async findAll(
    requestingUser: any,
    filters?: {
      role?: UserRole;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<User[]> {
    // Check permissions
    if (!this.hasManagerPermissions(requestingUser)) {
      throw new ForbiddenException('Only managers and admins can view all users');
    }

    const query: any = {};

    if (filters?.role) {
      query.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.search) {
      query.$or = [
        { email: { $regex: filters.search, $options: 'i' } },
        { fullName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const users = await this.userModel.find(query).sort('-createdAt').exec();
    return users.map(user => user.toObject());
  }

  /**
   * Find a single user by ID
   */
  async findOne(id: string, requestingUser?: any): Promise<User> {
    const user = await this.userModel.findOne({ firebaseUid: id }).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Check permissions if not self
    if (requestingUser && requestingUser.uid !== id && !this.hasManagerPermissions(requestingUser)) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return user.toObject();
  }

  /**
   * Find user by email (for managers)
   */
  async findByEmail(email: string, requestingUser: any): Promise<User | null> {
    if (!this.hasManagerPermissions(requestingUser)) {
      throw new ForbiddenException('Only managers and admins can search users by email');
    }

    const user = await this.userModel.findOne({ email }).exec();
    return user ? user.toObject() : null;
  }

  /**
   * Update user details
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUser: any,
  ): Promise<User> {
    const userDoc = await this.userModel.findOne({ firebaseUid: id }).exec();
    
    if (!userDoc) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Check permissions - users can update their own profile
    if (requestingUser.uid !== id && !this.hasManagerPermissions(requestingUser)) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Create a mutable copy of updateUserDto
    const updateData: any = { ...updateUserDto };

    // Regular users cannot update certain fields
    if (!this.hasManagerPermissions(requestingUser)) {
      delete updateData.role;
      delete updateData.firebaseUid;
      delete updateData.email;
      delete updateData.subscription; // Subscription updates should use dedicated endpoint
    }

    Object.assign(userDoc, updateData);
    await userDoc.save();
    return userDoc.toObject();
  }

  /**
   * Update user role (managers only)
   */
  async updateRole(
    id: string,
    updateRoleDto: UpdateRoleDto,
    requestingUser: any,
  ): Promise<User> {
    if (!this.hasManagerPermissions(requestingUser)) {
      throw new ForbiddenException('Only managers and admins can update user roles');
    }

    const userDoc = await this.userModel.findOne({ firebaseUid: id }).exec();
    
    if (!userDoc) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Prevent demoting last admin
    if (userDoc.role === UserRole.ADMIN && updateRoleDto.role !== UserRole.ADMIN) {
      const adminCount = await this.userModel.countDocuments({ role: UserRole.ADMIN }).exec();
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last admin');
      }
    }

    userDoc.role = updateRoleDto.role;
    await userDoc.save();
    return userDoc.toObject();
  }

  /**
   * Update user status (managers only)
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
    requestingUser: any,
  ): Promise<User> {
    if (!this.hasManagerPermissions(requestingUser)) {
      throw new ForbiddenException('Only managers and admins can update user status');
    }

    const userDoc = await this.userModel.findOne({ firebaseUid: id }).exec();
    
    if (!userDoc) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Prevent deactivating self
    if (requestingUser.uid === id && !updateStatusDto.isActive) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    // Prevent deactivating last active admin
    if (userDoc.role === UserRole.ADMIN && !updateStatusDto.isActive) {
      const activeAdminCount = await this.userModel
        .countDocuments({ role: UserRole.ADMIN, isActive: true })
        .exec();
      if (activeAdminCount <= 1) {
        throw new BadRequestException('Cannot deactivate the last active admin');
      }
    }

    userDoc.isActive = updateStatusDto.isActive;
    await userDoc.save();
    return userDoc.toObject();
  }

  /**
   * Get user statistics (for managers)
   */
  async getUserStats(userId: string, requestingUser: any): Promise<UserStatsDto> {
    if (!this.hasManagerPermissions(requestingUser) && requestingUser.uid !== userId) {
      throw new ForbiddenException('You can only view your own statistics');
    }

    await this.findOne(userId); // Verify user exists

    // Delegate to UserStatsService
    return await this.userStatsService.getUserStats(userId);
  }

  /**
   * Bulk update users (admins only)
   */
  async bulkUpdateStatus(
    userIds: string[],
    isActive: boolean,
    requestingUser: any,
  ): Promise<{ updated: number }> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can perform bulk operations');
    }

    const result = await this.userModel.updateMany(
      { 
        firebaseUid: { $in: userIds },
        $and: [{ firebaseUid: { $ne: requestingUser.uid } }]
      },
      { isActive },
    ).exec();

    return { updated: result.modifiedCount };
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async remove(id: string, requestingUser: any): Promise<User> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete users');
    }

    return await this.updateStatus(id, { isActive: false }, requestingUser);
  }

  /**
   * Helper: Check if user has manager permissions
   */
  private hasManagerPermissions(user: any): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  }

  /**
   * Helper: Get user from Firebase token
   */
  async getUserFromToken(firebaseUser: any): Promise<User> {
    let userDoc = await this.userModel.findOne({ firebaseUid: firebaseUser.uid }).exec();
    
    if (!userDoc) {
      // Auto-create user from Firebase with FREE subscription
      return await this.syncFromFirebase({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        fullName: firebaseUser.name || firebaseUser.email?.split('@')[0] || 'Unknown User',
      });
    }

    return userDoc.toObject();
  }

    /**
   * Update user's subscription plan - ADMIN ONLY
   * Includes audit logging for accountability
   */
  async updateSubscriptionAsAdmin(
    userId: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
    adminId: string,
  ): Promise<User> {
    const userDoc = await this.userModel.findOne({ firebaseUid: userId }).exec();
    
    if (!userDoc) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const previousPlan = userDoc.subscription;
    userDoc.subscription = updateSubscriptionDto.subscription;
    userDoc.subscriptionUpdatedAt = new Date();
    
    // Add audit metadata
    userDoc.metadata = {
      ...userDoc.metadata,
      subscriptionHistory: [
        ...(userDoc.metadata?.subscriptionHistory || []),
        {
          from: previousPlan,
          to: updateSubscriptionDto.subscription,
          changedBy: adminId,
          changedAt: new Date(),
          source: 'admin',
        },
      ],
    };
    
    await userDoc.save();
    
    console.log(`Admin subscription change: User ${userId} from ${previousPlan} to ${updateSubscriptionDto.subscription} by admin ${adminId}`);
    
    return userDoc.toObject();
  }

  /**
   * Update subscription from payment webhook
   * This method is called by Stripe/PayPal webhooks
   */
  async updateSubscriptionFromPaymentWebhook(
    userId: string,
    subscription: SubscriptionPlan,
    paymentProvider: 'stripe' | 'paypal',
    paymentMetadata: any,
  ): Promise<User> {
    const userDoc = await this.userModel.findOne({ firebaseUid: userId }).exec();
    
    if (!userDoc) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const previousPlan = userDoc.subscription;
    userDoc.subscription = subscription;
    userDoc.subscriptionUpdatedAt = new Date();
    
    // Add payment metadata
    userDoc.metadata = {
      ...userDoc.metadata,
      subscriptionHistory: [
        ...(userDoc.metadata?.subscriptionHistory || []),
        {
          from: previousPlan,
          to: subscription,
          changedAt: new Date(),
          source: paymentProvider,
          paymentMetadata,
        },
      ],
      lastPaymentProvider: paymentProvider,
      lastPaymentMetadata: paymentMetadata,
    };
    
    await userDoc.save();
    
    console.log(`Payment webhook subscription change: User ${userId} from ${previousPlan} to ${subscription} via ${paymentProvider}`);
    
    return userDoc.toObject();
  }
}