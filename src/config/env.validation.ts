// src/config/env.validation.ts
// Environment configuration with validation

import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsEnum,
  validateSync,
  IsEmail,
  Min,
  Max,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number;

  // MongoDB
  @IsString()
  MONGO_URI: string;

  // Firebase
  @IsString()
  FIREBASE_TYPE: string;

  @IsString()
  FIREBASE_PROJECT_ID: string;

  @IsString()
  FIREBASE_PRIVATE_KEY_ID: string;

  @IsString()
  FIREBASE_PRIVATE_KEY: string;

  @IsEmail()
  FIREBASE_CLIENT_EMAIL: string;

  @IsString()
  FIREBASE_CLIENT_ID: string;

  @IsUrl()
  FIREBASE_AUTH_URI: string;

  @IsUrl()
  FIREBASE_TOKEN_URI: string;

  @IsUrl()
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL: string;

  @IsUrl()
  FIREBASE_CLIENT_X509_CERT_URL: string;

  @IsString()
  FIREBASE_UNIVERSE_DOMAIN: string;

  // OpenAI
  @IsString()
  OPENAI_API_KEY: string;

  // Stripe (Optional)
  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  STRIPE_PRICE_BASIC?: string;

  @IsOptional()
  @IsString()
  STRIPE_PRICE_PRO?: string;

  // PayPal (Optional)
  @IsOptional()
  @IsString()
  PAYPAL_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  PAYPAL_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  PAYPAL_WEBHOOK_ID?: string;

  @IsOptional()
  @IsString()
  PAYPAL_PLAN_BASIC?: string;

  @IsOptional()
  @IsString()
  PAYPAL_PLAN_PRO?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => {
        const constraints = error.constraints || {};
        return `${error.property}: ${Object.values(constraints).join(', ')}`;
      })
      .join('\n');
    
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  return validatedConfig;
}
