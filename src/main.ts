import * as dotenv from 'dotenv';
// Load environment variables from a .env file so that runtime secrets are available
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';

/**
 * Bootstrap the NestJS application.  This function is responsible for
 * configuring the Firebase Admin SDK using environment variables and
 * spinning up the HTTP server.  Values are asserted with the non-null
 * assertion operator to satisfy the TypeScript compiler since all keys
 * are expected to be defined at runtime via environment configuration.
 */
async function bootstrap() {
  const firebase_params = {
    type: process.env.FIREBASE_TYPE!,
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID!,
    // Replace escaped newlines in the private key so that the Firebase SDK
    // receives a properly formatted key.  Without this, authentication will
    // fail because the key contains literal "\n" characters.
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    clientId: process.env.FIREBASE_CLIENT_ID!,
    authUri: process.env.FIREBASE_AUTH_URI!,
    tokenUri: process.env.FIREBASE_TOKEN_URI!,
    authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL!,
    // Fixed typo: use clientX509CertUrl instead of clientC509CertUrl
    clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL!,
    universeDomain: process.env.FIREBASE_UNIVERSE_DOMAIN!,
  };

  admin.initializeApp({
    credential: admin.credential.cert(firebase_params as admin.ServiceAccount),
  });

  const app = await NestFactory.create(AppModule);
  // Enable Cross-Origin Resource Sharing so that the frontend can talk to this API
  app.enableCors();
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();