// src/common/errors/error-handler.service.ts
// Service for handling errors consistently

import { Injectable, Logger } from '@nestjs/common';
import { 
  BaseError, 
  ConflictError, 
  ValidationError, 
  RateLimitError, 
  ExternalServiceError 
} from './custom-errors';

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * Handle database errors
   */
  handleDatabaseError(error: any, operation: string, entity: string): never {
    this.logger.error(`Database error during ${operation} ${entity}:`, error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      throw new ConflictError(
        `${entity} with this ${field} already exists`,
        error.keyValue,
      );
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {})
        .map((err: any) => err.message)
        .join(', ');
      throw new ValidationError(
        `Validation failed: ${messages}`,
        error.errors,
      );
    }

    if (error.name === 'CastError') {
      throw new ValidationError(
        `Invalid ${error.path}: ${error.value}`,
      );
    }

    throw new BaseError(
      500,
      `Database error during ${operation} ${entity}`,
    );
  }

  /**
   * Handle external API errors
   */
  handleExternalApiError(error: any, service: string): never {
    this.logger.error(`External API error from ${service}:`, error);

    if (error.response) {
      // API responded with error
      const status = error.response.status;
      const data = error.response.data;

      if (status === 429) {
        throw new RateLimitError(
          data.limit || 0,
          new Date(data.resetTime || Date.now() + 3600000),
          `${service} rate limit exceeded`,
        );
      }

      throw new ExternalServiceError(service, data);
    }

    if (error.request) {
      // Request was made but no response
      throw new ExternalServiceError(
        service,
        'No response from service',
      );
    }

    // Something else happened
    throw new ExternalServiceError(service, error.message);
  }

  /**
   * Log and rethrow errors
   */
  logAndThrow(error: any, context: string): never {
    if (error instanceof BaseError) {
      this.logger.error(`${context}: ${error.message}`, error.stack);
      throw error;
    }

    this.logger.error(`${context}: Unexpected error`, error);
    throw new BaseError(500, 'An unexpected error occurred');
  }
}