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

interface MongoError extends Error {
  code?: number;
  keyPattern?: Record<string, any>;
  keyValue?: Record<string, any>;
  errors?: Record<string, { message: string }>;
}

interface CastError extends Error {
  name: 'CastError';
  path: string;
  value: any;
}

interface AxiosError {
  response?: {
    status: number;
    data: any;
  };
  request?: any;
  message: string;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * Handle database errors
   */
  handleDatabaseError(error: unknown, operation: string, entity: string): never {
    this.logger.error(`Database error during ${operation} ${entity}:`, error);

    const mongoError = error as MongoError;

    if (mongoError.code === 11000) {
      const field = Object.keys(mongoError.keyPattern || {})[0];
      throw new ConflictError(
        `${entity} with this ${field} already exists`,
        mongoError.keyValue,
      );
    }

    if (mongoError.name === 'ValidationError') {
      const messages = Object.values(mongoError.errors || {})
        .map((err) => err.message)
        .join(', ');
      throw new ValidationError(
        `Validation failed: ${messages}`,
        mongoError.errors,
      );
    }

    const castError = error as CastError;
    if (castError.name === 'CastError') {
      throw new ValidationError(
        `Invalid ${castError.path}: ${castError.value}`,
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
  handleExternalApiError(error: unknown, service: string): never {
    this.logger.error(`External API error from ${service}:`, error);

    const axiosError = error as AxiosError;

    if (axiosError.response) {
      // API responded with error
      const status = axiosError.response.status;
      const data = axiosError.response.data;

      if (status === 429) {
        throw new RateLimitError(
          data.limit || 0,
          new Date(data.resetTime || Date.now() + 3600000),
          `${service} rate limit exceeded`,
        );
      }

      throw new ExternalServiceError(service, data);
    }

    if (axiosError.request) {
      // Request was made but no response
      throw new ExternalServiceError(
        service,
        'No response from service',
      );
    }

    // Something else happened
    throw new ExternalServiceError(service, axiosError.message || error);
  }

  /**
   * Log and rethrow errors
   */
  logAndThrow(error: unknown, context: string): never {
    if (error instanceof BaseError) {
      this.logger.error(`${context}: ${error.message}`, error.stack);
      throw error;
    }

    this.logger.error(`${context}: Unexpected error`, error);
    throw new BaseError(500, 'An unexpected error occurred');
  }
}