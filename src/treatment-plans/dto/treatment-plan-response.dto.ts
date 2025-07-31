// src/treatment-plans/dto/treatment-plan-response.dto.ts
export interface TreatmentPlanResponse {
  planId: string;
  futuregraphSessionId: string;
  clientId: string;
  numberOfSessions: number;
  sessionDuration: number;
  overallGoal: string;
  treatmentApproach: string;
  language: string;
  sessions: Array<{
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
  }>;
  summary: {
    keyThemes: string[];
    progressionStrategy: string;
    adaptationGuidelines: string;
    expectedOutcomes: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  status: string;
  usage?: {
    remaining: number;
    limit: number;
    message?: string;
  };
}