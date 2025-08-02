// src/users/schemas/user.schema.ts
// Updated with Swagger decorators

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  THERAPIST = 'therapist',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}

@Schema({ timestamps: true })
export class User {
  @ApiProperty({
    description: 'User full name',
    example: 'Dr. Jane Smith',
  })
  @Prop({ required: true })
  fullName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'jane.smith@example.com',
  })
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.THERAPIST,
  })
  @Prop({ required: true, enum: UserRole, default: UserRole.THERAPIST })
  role: UserRole;

  @ApiProperty({
    description: 'User active status',
    example: true,
  })
  @Prop({ required: true, default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Firebase UID',
    example: 'abc123xyz',
  })
  @Prop({ required: true, unique: true, index: true })
  firebaseUid: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  @Prop()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Profile picture URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @Prop()
  profilePicture?: string;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Prop()
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'Additional metadata',
    type: 'object',
    required: false,
  })
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Subscription plan',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.FREE,
  })
  @Prop({ 
    required: true, 
    enum: SubscriptionPlan, 
    default: SubscriptionPlan.FREE,
    index: true 
  })
  subscription: SubscriptionPlan;

  @ApiProperty({
    description: 'Subscription last updated date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Prop()
  subscriptionUpdatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function(next) {
  if (this.isModified('subscription')) {
    this.subscriptionUpdatedAt = new Date();
  }
  next();
});