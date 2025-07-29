import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';

/**
 * Enhanced guard that verifies Firebase ID tokens, ensures users exist in the database,
 * checks user status, and validates permissions based on routes.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      throw new UnauthorizedException('Authorization token not found.');
    }

    try {
      // Verify the token with the Firebase Admin SDK
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Get or create user in database
      let userDoc = await this.userModel.findOne({ firebaseUid: decodedToken.uid }).exec();
      
      if (!userDoc) {
        // Auto-create user from Firebase token
        userDoc = await this.userModel.create({
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
          fullName: decodedToken.name || decodedToken.email?.split('@')[0] || 'Unknown User',
          role: 'therapist',
          isActive: true,
          lastLoginAt: new Date(),
        });
      } else {
        // Update last login
        userDoc.lastLoginAt = new Date();
        await userDoc.save();
      }
      
      // Check if user is active
      if (!userDoc.isActive) {
        throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
      }
      
      // Attach both Firebase token data and database user to request
      request.user = {
        ...decodedToken,
        dbUser: userDoc.toObject(),
        role: userDoc.role,
      };
      
      // Get the authenticated userId from the token
      const authenticatedUserId = decodedToken.uid;
      // Get the userId from the URL parameter (if it exists)
      const requestedUserId = request.params.userId;
      
      // For routes that don't have userId parameter, just verify the token
      if (!requestedUserId) {
        return true;
      }
      
      // For routes with userId parameter, ensure they match (unless user is manager/admin)
      if (authenticatedUserId !== requestedUserId) {
        // Managers and admins can access any user's resources
        if (userDoc.role === 'admin' || userDoc.role === 'manager') {
          return true;
        }
        throw new UnauthorizedException('You are not authorized to access this resource.');
      }
      
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      
      // If it's already an UnauthorizedException, rethrow it
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Otherwise, it's likely a token verification error
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}