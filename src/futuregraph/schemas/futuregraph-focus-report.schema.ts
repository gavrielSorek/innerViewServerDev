// src/futuregraph/schemas/futuregraph-focus-report.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FuturegraphFocusReportDocument = FuturegraphFocusReport & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class FuturegraphFocusReport {
  /** Reference to the original session */
  @Prop({ required: true, index: true })
  sessionId!: string;

  /** User who created this focus report */
  @Prop({ required: true, index: true })
  userId!: string;

  /** Client ID from the original session */
  @Prop({ required: true, index: true })
  clientId!: string;

  /** The focus area for this report */
  @Prop({ required: true, index: true })
  focus!: string;

  /** Language of the report */
  @Prop({ required: true, default: 'en' })
  language!: string;

  /** The focused analysis results */
  @Prop({ type: Object, required: true })
  focusedAnalysis!: Record<string, any>;

  /** Generated focused report */
  @Prop({ type: Object, required: true })
  focusedReport!: Record<string, any>;

  /** Unique identifier for this focus report */
  @Prop({ required: true, unique: true, index: true })
  focusReportId!: string;

  /** Status of the focus report generation */
  @Prop({ required: true, default: 'completed' })
  status!: string;

  /** Any error that occurred during generation */
  @Prop()
  error?: string;
}

export const FuturegraphFocusReportSchema = SchemaFactory.createForClass(FuturegraphFocusReport);

// Create compound index for efficient querying
FuturegraphFocusReportSchema.index({ sessionId: 1, focus: 1, language: 1 });
FuturegraphFocusReportSchema.index({ userId: 1, createdAt: -1 });