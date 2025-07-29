// scripts/create-admin.ts
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { UserRole } from '../src/users/schemas/user.schema';

dotenv.config();

async function createAdminUser() {
  try {
    // Initialize Firebase Admin
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
      credential: admin.credential.cert(firebase_params as admin.ServiceAccount),
    });

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');

    // Get admin email from command line argument
    const adminEmail = process.argv[2];
    const adminName = process.argv[3] || 'System Administrator';

    if (!adminEmail) {
      console.error('Please provide admin email as argument: npm run create-admin <email> [name]');
      process.exit(1);
    }

    // Check if user exists in Firebase
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(adminEmail);
      console.log('Firebase user found:', firebaseUser.uid);
    } catch (error) {
      console.log('Firebase user not found, creating...');
      firebaseUser = await admin.auth().createUser({
        email: adminEmail,
        displayName: adminName,
        password: 'TempPassword123!', // User should change this immediately
      });
      console.log('Firebase user created:', firebaseUser.uid);
    }

    // Create or update user in MongoDB
    const UserSchema = new mongoose.Schema({
      fullName: String,
      email: String,
      role: String,
      isActive: Boolean,
      firebaseUid: String,
      lastLoginAt: Date,
      createdAt: Date,
      updatedAt: Date,
    });

    const UserModel = mongoose.model('User', UserSchema);

    const existingUser = await UserModel.findOne({ firebaseUid: firebaseUser.uid });

    if (existingUser) {
      existingUser.role = UserRole.ADMIN;
      await existingUser.save();
      console.log('User updated to admin role');
    } else {
      await UserModel.create({
        firebaseUid: firebaseUser.uid,
        email: adminEmail,
        fullName: adminName,
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('Admin user created in database');
    }

    console.log('\nAdmin user setup complete!');
    console.log('Email:', adminEmail);
    console.log('Name:', adminName);
    console.log('Role: admin');
    
    if (!existingUser) {
      console.log('\nIMPORTANT: Default password is "TempPassword123!" - please change it immediately!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();