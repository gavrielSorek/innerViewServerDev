import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FuturegraphSessionDocument = FuturegraphSession & Document;

@Schema()
export class FuturegraphSession {
  @Prop({ required: true, unique: true })
  sessionId!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  clientId!: string;

  // Base64 encoded handwriting image.
  @Prop({ required: true })
  handwritingImage!: string;

  // Arbitrary structured context provided at session start.
  @Prop({ type: Object })
  clientContext?: Record<string, any>;

  @Prop({ required: true })
  startTime!: Date;

  // Array of round results.  Each entry contains the AI analysis and
  // associated metadata.
  @Prop({ type: [Object], default: [] })
  rounds!: Array<{
    roundNumber: number;
    timestamp: Date;
    analysis: any;
    additionalContext?: any;
    therapistApproved: boolean;
    therapistFeedback?: string;
    approvalTimestamp?: Date;
    requiresReprocessing?: boolean;
    qaValidation?: {
      passed: boolean;
      violations: string[];
      warnings: string[];
    };
  }>;

  @Prop({ default: 0 })
  currentRound!: number;

  @Prop({ default: 'active' })
  status!: string;
}

export const FuturegraphSessionSchema =
  SchemaFactory.createForClass(FuturegraphSession);
