// src/common/utils/validation.utils.ts
// Validation utility functions

import { ValidationError } from 'class-validator';

/**
 * Format validation errors into readable messages
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap(error => {
    if (error.constraints) {
      return Object.values(error.constraints);
    }
    if (error.children && error.children.length > 0) {
      return formatValidationErrors(error.children).map(
        childError => `${error.property}.${childError}`,
      );
    }
    return [];
  });
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}
