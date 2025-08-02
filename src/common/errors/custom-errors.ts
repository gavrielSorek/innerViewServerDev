// src/common/errors/custom-errors.ts
// Custom error classes for better error handling

export class BaseError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(400, message, details);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication required') {
    super(401, message);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message);
  }
}

export class ResourceNotFoundError extends BaseError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID "${id}" not found`
      : `${resource} not found`;
    super(404, message);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, details?: any) {
    super(409, message, details);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(service: string, originalError?: any) {
    super(
      503,
      `External service error: ${service}`,
      originalError?.message || originalError,
    );
  }
}

export class RateLimitError extends BaseError {
  constructor(
    public readonly limit: number,
    public readonly resetTime: Date,
    message?: string,
  ) {
    super(
      429,
      message || 'Rate limit exceeded',
      { limit, resetTime },
    );
  }
}
