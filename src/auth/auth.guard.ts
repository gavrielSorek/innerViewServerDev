import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Guard that verifies Firebase ID tokens and ensures that the
 * authenticated userId matches the userId present in the route
 * parameters (when present).  Requests that fail these checks will
 * result in an UnauthorizedException.
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
      // Get the userId from the URL parameter (if it exists)
      const requestedUserId = request.params.userId;
      
      // For routes that don't have userId parameter (like /ai/futuregraph/*), 
      // just verify the token and attach user to request
      if (!requestedUserId) {
        request.user = decodedToken;
        return true;
      }
      
      // For routes with userId parameter, ensure they match
      if (authenticatedUserId !== requestedUserId) {
        throw new UnauthorizedException('You are not authorized to access this resource.');
      }
      
      // Attach user to the request object if needed for later use
      request.user = decodedToken;
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