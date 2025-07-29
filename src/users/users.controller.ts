import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateRoleDto,
  UpdateStatusDto,
  SyncUserDto,
  UpdateSubscriptionDto,
} from './dto';
import { AuthGuard } from '../auth/auth.guard';
import { UserRole } from './schemas/user.schema';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create or sync user (typically called after Firebase registration)
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return {
      user,
      message: 'User created/synced successfully',
    };
  }

  /**
   * Sync user from Firebase (auto-create if not exists)
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncUser(@Body() syncUserDto: SyncUserDto) {
    const user = await this.usersService.syncFromFirebase(syncUserDto);
    return {
      user,
      message: 'User synced successfully',
    };
  }

  /**
   * Get current user profile
   */
  @Get('me')
  async getCurrentUser(@Request() req: any) {
    const user = await this.usersService.getUserFromToken(req.user);
    const stats = await this.usersService.getUserStats(user.firebaseUid, req.user);
    return {
      user,
      stats,
    };
  }

  /**
   * Update current user's subscription plan
   */
  @Patch('subscription')
  async updateSubscription(
    @Request() req: any,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    const user = await this.usersService.updateSubscription(
      req.user.uid,
      updateSubscriptionDto,
    );
    return {
      user,
      message: 'Subscription updated successfully',
    };
  }

  /**
   * Get all users (managers only)
   */
  @Get()
  async findAll(
    @Request() req: any,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const currentUser = await this.usersService.getUserFromToken(req.user);
    req.user.role = currentUser.role;

    const filters = {
      role,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      search,
    };

    const users = await this.usersService.findAll(req.user, filters);
    return {
      users,
      total: users.length,
    };
  }

  /**
   * Search users by email (managers only)
   */
  @Get('search')
  async searchByEmail(@Request() req: any, @Query('email') email: string) {
    const currentUser = await this.usersService.getUserFromToken(req.user);
    req.user.role = currentUser.role;

    const user = await this.usersService.findByEmail(email, req.user);
    return {
      user,
      found: !!user,
    };
  }

  /**
   * Get user statistics (self or by managers)
   */
  @Get(':userId/stats')
  async getUserStats(@Request() req: any, @Param('userId') userId: string) {
    const currentUser = await this.usersService.getUserFromToken(req.user);
    req.user.role = currentUser.role;

    const stats = await this.usersService.getUserStats(userId, req.user);
    return stats;
  }

  /**
   * Get specific user profile
   */
  @Get(':userId')
  async findOne(@Request() req: any, @Param('userId') userId: string) {
    const currentUser = await this.usersService.getUserFromToken(req.user);
    req.user.role = currentUser.role;

    const user = await this.usersService.findOne(userId, req.user);
    return { user };
  }

  /**
   * Update user details
   */
  @Patch(':userId')
  async update(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const currentUser = await this.usersService.getUserFromToken(req.user);
    req.user.role = currentUser.role;

    const user = await this.usersService.update(userId, updateUserDto, req.user);
    return {
      user,
      message: 'User updated successfully',
    };
  }

  /**
   * Update user role (managers only)
   */
  @Patch(':userId/role')
  async updateRole(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const currentUser = await this.usersService.getUserFromToken(req.user);
    req.user.role = currentUser.role;

    const user = await this.usersService.updateRole(userId, updateRoleDto, req.user);
    return {
      user,
      message: 'User role updated successfully',
    };
  }

  /**
   * Update user status (managers only)
   */
  @Patch(':userId/status')
  async updateStatus(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    const currentUser = await this.usersService.getUserFromToken(req.user);
    req.user.role = currentUser.role;

    const user = await this.usersService.updateStatus(userId, updateStatusDto, req.user);
    return {
      user,
      message: `User ${updateStatusDto.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  /**
   * Bulk update user status (admins only)
   */
  @Post('bulk/status')
  async bulkUpdateStatus(
    @Request() req: any,
    @Body() body: { userIds: string[]; isActive: boolean },
  ) {
    const currentUser = await this.usersService.getUserFromToken(req.user);
    req.user.role = currentUser.role;

    const result = await this.usersService.bulkUpdateStatus(
      body.userIds,
      body.isActive,
      req.user,
    );
    return {
      ...result,
      message: `${result.updated} users updated successfully`,
    };
  }

  /**
   * Delete user (admins only - soft delete)
   */
  @Delete(':userId')
  async remove(@Request() req: any, @Param('userId') userId: string) {
    const currentUser = await this.usersService.getUserFromToken(req.user);
    req.user.role = currentUser.role;

    const user = await this.usersService.remove(userId, req.user);
    return {
      user,
      message: 'User deleted successfully',
    };
  }
}