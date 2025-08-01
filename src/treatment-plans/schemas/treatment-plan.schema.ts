// src/treatment-plans/schemas/treatment-plan.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TreatmentPlanDocument = TreatmentPlan & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export interface SessionDetail {
  sessionNumber: number;
  therapeuticGoal: string;
  methodsUsed: string[];
  mainTechnique: string;
  therapistGuidance: string;
  clientExercise: string;
  timeAllocation: {
    opening: number;
    exploration: number;
    practice: number;
    processing: number;
    closing: number;
  };
}

@Schema({ timestamps: true })
export class TreatmentPlan {
  /** Unique treatment plan identifier */
  @Prop({ required: true, unique: true, index: true })
  planId!: string;

  /** Reference to the FutureGraph session */
  @Prop({ required: true, index: true })
  futuregraphSessionId!: string;

  /** Optional reference to a focus report if plan was created from it */
  @Prop({ index: true })
  focusReportId?: string;

  /** Source type: 'session' or 'focus-report' */
  @Prop({ required: true, default: 'session' })
  sourceType!: 'session' | 'focus-report';

  /** Focus area if created from focus report */
  @Prop()
  focusArea?: string;

  /** User who created this treatment plan */
  @Prop({ required: true, index: true })
  userId!: string;

  /** Client ID from the FutureGraph session */
  @Prop({ required: true, index: true })
  clientId!: string;

  /** Number of sessions in the plan */
  @Prop({ required: true })
  numberOfSessions!: number;

  /** Duration of each session in minutes */
  @Prop({ required: true, default: 50 })
  sessionDuration!: number;

  /** Overall treatment goal */
  @Prop({ required: true })
  overallGoal!: string;

  /** Preferred treatment methods */
  @Prop({ type: [String], default: [] })
  preferredMethods!: string[];

  /** Treatment approach (integrative, holistic, etc.) */
  @Prop({ required: true })
  treatmentApproach!: string;

  /** Language of the plan */
  @Prop({ required: true, default: 'he' })
  language!: string;

  /** Detailed session breakdown */
  @Prop({ type: [Object], required: true })
  sessions!: SessionDetail[];

  /** Summary and recommendations */
  @Prop({ type: Object })
  summary?: {
    keyThemes: string[];
    progressionStrategy: string;
    adaptationGuidelines: string;
    expectedOutcomes: string[];
  };

  /** Client context from FutureGraph */
  @Prop({ type: Object })
  clientContext?: Record<string, any>;

  /** Status of the treatment plan */
  @Prop({ required: true, default: 'active' })
  status!: 'active' | 'completed' | 'archived';

  /** Any notes or modifications */
  @Prop()
  notes?: string;
}

export const TreatmentPlanSchema = SchemaFactory.createForClass(TreatmentPlan);

// Create indexes for efficient querying
TreatmentPlanSchema.index({ userId: 1, createdAt: -1 });
TreatmentPlanSchema.index({ clientId: 1, createdAt: -1 });
TreatmentPlanSchema.index({ futuregraphSessionId: 1 }); 