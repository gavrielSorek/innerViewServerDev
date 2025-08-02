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

// src/config/configuration.ts
// Application configuration

export default () => ({
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    name: 'Inner View AI',
    version: '1.0.0',
  },
  database: {
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  firebase: {
    type: process.env.FIREBASE_TYPE,
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: process.env.FIREBASE_AUTH_URI,
    tokenUri: process.env.FIREBASE_TOKEN_URI,
    authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universeDomain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.7,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      basic: process.env.STRIPE_PRICE_BASIC,
      pro: process.env.STRIPE_PRICE_PRO,
    },
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
    plans: {
      basic: process.env.PAYPAL_PLAN_BASIC,
      pro: process.env.PAYPAL_PLAN_PRO,
    },
  },
  security: {
    bcryptRounds: 10,
    jwtExpiresIn: '7d',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
});