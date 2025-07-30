// src/usage-tracking/schemas/usage-tracking.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UsageTrackingDocument = UsageTracking & Document;

export enum UsageType {
  FUTUREGRAPH_ANALYZE = 'futuregraph_analyze',
  AI_CHAT = 'ai_chat',
}

@Schema({ timestamps: true })
export class UsageTracking {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: UsageType, index: true })
  usageType: UsageType;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ type: Object })
  metadata?: {
    sessionId?: string;
    clientId?: string;
    messageLength?: number;
    responseTime?: number;
    error?: boolean;
    [key: string]: any;
  };

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const UsageTrackingSchema = SchemaFactory.createForClass(UsageTracking);

// Create compound index for efficient querying
UsageTrackingSchema.index({ userId: 1, usageType: 1, timestamp: -1 });
UsageTrackingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days