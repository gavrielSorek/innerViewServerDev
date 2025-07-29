import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  THERAPIST = 'therapist',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.THERAPIST })
  role: UserRole;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, unique: true, index: true })
  firebaseUid: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  profilePicture?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const UserSchema = SchemaFactory.createForClass(User);