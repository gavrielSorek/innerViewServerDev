import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Guard that verifies Firebase ID tokens and ensures that the
 * authenticated userId matches the userId present in the route
 * parameters.  Requests that fail these checks will result in an
 * UnauthorizedException.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      throw new UnauthorizedException('Authorization token not found.');
    }

    try {
      // Verify the token with the Firebase Admin SDK
      const decodedToken = await admin.auth().verifyIdToken(token);
      // Get the authenticated userId from the token
      const authenticatedUserId = decodedToken.uid;
      // Get the userId from the URL parameter
      const requestedUserId = request.params.userId;
      // Ensure they match
      if (authenticatedUserId !== requestedUserId) {
        throw new UnauthorizedException('You are not authorized to access this resource.');
      }
      // Attach user to the request object if needed for later use
      request.user = decodedToken;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new UnauthorizedException('Invalid or expired token.');
    }
    return true;
  }
}