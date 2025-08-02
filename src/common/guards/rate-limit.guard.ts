// src/common/guards/rate-limit.guard.ts
// Rate limiting guard for API protection

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitError } from '../errors/custom-errors';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs });

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly storage = new Map<string, RateLimitEntry>();

  constructor(
    private reflector: Reflector,
    private readonly defaultLimit: number = 100,
    private readonly defaultWindowMs: number = 60000, // 1 minute
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get rate limit config from decorator or use defaults
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    ) || {
      limit: this.defaultLimit,
      windowMs: this.defaultWindowMs,
    };

    const key = this.generateKey(request);
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanup(now);

    const entry = this.storage.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry
      this.storage.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    // Increment count
    entry.count++;

    if (entry.count > config.limit) {
      const resetDate = new Date(entry.resetTime);
      throw new RateLimitError(config.limit, resetDate);
    }

    return true;
  }

  private generateKey(request: any): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = request.user?.uid;
    const ip = request.ip || request.connection.remoteAddress;
    const route = `${request.method}:${request.route?.path || request.path}`;
    
    return userId ? `user:${userId}:${route}` : `ip:${ip}:${route}`;
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.resetTime) {
        this.storage.delete(key);
      }
    }
  }
}