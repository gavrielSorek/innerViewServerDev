// src/main.ts
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import compression from 'compression';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from './common/errors/custom-errors';

/**
 * Bootstrap the NestJS application with proper configuration and error handling
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    // Create the application
    const app = await NestFactory.create(AppModule, {
      bodyParser: false, // Disable the default body parser for webhook support
      logger: ['error', 'warn', 'log'],
    });

    // Get configuration service
    const configService = app.get(ConfigService);

    // Initialize Firebase Admin SDK
    const firebaseConfig = {
      type: configService.get('firebase.type'),
      projectId: configService.get('firebase.projectId'),
      privateKeyId: configService.get('firebase.privateKeyId'),
      privateKey: configService.get('firebase.privateKey'),
      clientEmail: configService.get('firebase.clientEmail'),
      clientId: configService.get('firebase.clientId'),
      authUri: configService.get('firebase.authUri'),
      tokenUri: configService.get('firebase.tokenUri'),
      authProviderX509CertUrl: configService.get('firebase.authProviderX509CertUrl'),
      clientX509CertUrl: configService.get('firebase.clientX509CertUrl'),
      universeDomain: configService.get('firebase.universeDomain'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
    });

    // Configure body parser with webhook support
    const rawBodyBuffer = (req: any, res: any, buf: Buffer, encoding: any) => {
      if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
      }
    };

    app.use(bodyParser.json({ verify: rawBodyBuffer, limit: '10mb' }));
    app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, limit: '10mb', extended: true }));
    app.use(bodyParser.raw({ verify: rawBodyBuffer, type: '*/*', limit: '10mb' }));

    // Security middleware
    app.use(helmet());
    app.use(compression());

    // Enable CORS with configuration
    const corsOrigins = configService.get<string[]>('security.corsOrigins');
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Global prefix and versioning
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    // Global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const messages = errors
            .map(error => {
              const constraints = Object.values(error.constraints || {});
              return `${error.property}: ${constraints.join(', ')}`;
            })
            .join('; ');
          return new ValidationError(`Validation failed: ${messages}`);
        },
      }),
    );

    // Global filters
    app.useGlobalFilters(new AllExceptionsFilter());

    // Global interceptors
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    // Swagger documentation
    if (configService.get('app.env') !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Inner View AI API')
        .setDescription('API documentation for Inner View AI therapy management system')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
    }

    // Health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: configService.get('app.env'),
        version: configService.get('app.version'),
      });
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.log('Received shutdown signal, closing connections...');
      await app.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Start the server
    const port = configService.get('app.port');
    await app.listen(port);
    
    logger.log(`Application is running on: ${await app.getUrl()}`);
    logger.log(`Environment: ${configService.get('app.env')}`);
    
    if (configService.get('app.env') !== 'production') {
      logger.log(`API Documentation available at: ${await app.getUrl()}/api/docs`);
    }
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();