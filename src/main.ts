// src/main.ts
import * as dotenv from 'dotenv'; // Import dotenv
dotenv.config(); // Load environment variables from .env file

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';

// import * as serviceAccount from '../serviceAccountKey.json'; // This line should remain commented out or removed

async function bootstrap() {
  // --- INITIALIZE FIREBASE ADMIN SDK ---
  // --- IMPORTANT: We will now get these from environment variables ---
  const firebase_params = {
    type: process.env.FIREBASE_TYPE!, // Added ! to assert non-null
    projectId: process.env.FIREBASE_PROJECT_ID!, // Added ! to assert non-null
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID!, // Added ! to assert non-null
    // The private key needs special handling for newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'), // Added ! to assert non-null
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!, // Added ! to assert non-null
    clientId: process.env.FIREBASE_CLIENT_ID!, // Added ! to assert non-null
    authUri: process.env.FIREBASE_AUTH_URI!, // Added ! to assert non-null
    tokenUri: process.env.FIREBASE_TOKEN_URI!, // Added ! to assert non-null
    authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL!, // Added ! to assert non-null
    clientC509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL!, // Added ! to assert non-null
    universeDomain: process.env.FIREBASE_UNIVERSE_DOMAIN!, // Added ! to assert non-null
  };

  admin.initializeApp({
    // Changed admin.credential.ServiceAccount to admin.ServiceAccount
    credential: admin.credential.cert(firebase_params as admin.ServiceAccount),
  });
  // ------------------------------------

  const app = await NestFactory.create(AppModule);

  // Enable Cross-Origin Resource Sharing
  app.enableCors();

  // Use the PORT environment variable provided by Render, or default to 3000 for local development
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();