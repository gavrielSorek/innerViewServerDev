import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';
import * as bodyParser from 'body-parser';

/**
 * Bootstrap the NestJS application.  This function is responsible for
 * configuring the Firebase Admin SDK using environment variables and
 * spinning up the HTTP server.
 */
async function bootstrap() {
  const firebase_params = {
    type: process.env.FIREBASE_TYPE!,
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    clientId: process.env.FIREBASE_CLIENT_ID!,
    authUri: process.env.FIREBASE_AUTH_URI!,
    tokenUri: process.env.FIREBASE_TOKEN_URI!,
    authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL!,
    clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL!,
    universeDomain: process.env.FIREBASE_UNIVERSE_DOMAIN!,
  };

  admin.initializeApp({
    credential: admin.credential.cert(
      firebase_params as admin.ServiceAccount,
    ),
  });

  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable the default body parser
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

  app.enableCors();
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();