// src/common/types/index.ts
// Common type definitions to replace 'any' types throughout the application

import { User } from '../../users/schemas/user.schema';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  rawBody?: string;
}

/**
 * Authenticated user from Firebase with database user
 */
export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  dbUser: User;
  role: string;
}

/**
 * FutureGraph Analysis Result Types
 */
export interface CoreIdentity {
  name: string;
  narrative: string;
  clinicalAnalysis: string;
  ego: string;
  thinking: string;
}

export interface PersonalityLayer {
  patterns: string[];
  insights: string[];
}

export interface PersonalityLayers {
  visible: PersonalityLayer;
  conscious: PersonalityLayer;
  subconscious: PersonalityLayer;
  hidden: PersonalityLayer;
}

export interface DefenseMask {
  type: string;
  description: string;
  impact: string;
}

export interface DefenseMechanisms {
  primaryMask: DefenseMask;
  secondaryMasks: DefenseMask[];
}

export interface InternalContract {
  name: string;
  description: string;
  purpose: string;
  impact: string;
}

export interface InternalContracts {
  contracts: InternalContract[];
  overallImpact: string;
}

export interface CapabilityCategory {
  capabilities: string[];
  strengths: string[];
}

export interface Capabilities {
  intellectual: CapabilityCategory;
  emotional: CapabilityCategory;
  social: CapabilityCategory;
  summary: string;
}

export interface LimitingBeliefs {
  coreBelief: string;
  supportingBeliefs: string[];
  origin: string;
}

export interface EmotionalPatterns {
  dominant: string[];
  suppressed: string[];
  conflicts: string[];
}

export interface FuturegraphAnalysis {
  coreIdentity: CoreIdentity;
  personalityLayers: PersonalityLayers;
  defenceMechanisms: DefenseMechanisms;
  internalContracts: InternalContracts;
  intellectualEmotionalSocialCapabilities: Capabilities;
  limitingBeliefs: LimitingBeliefs;
  emotionalPatterns: EmotionalPatterns;
  therapeuticInsights: string[];
  treatmentRecommendations: string[];
  therapeuticGoals: string[];
  recommendedApproach: string;
  suggestedTimeline: string;
  focusAreas: string[];
}

export interface TherapeuticContract {
  goals: string[];
  approach: string;
  timeline: string;
  focusAreas: string[];
}

export interface FuturegraphReport {
  sessionId: string;
  clientId: string;
  generatedAt: Date;
  language: string;
  executiveSummary: string;
  coreIdentity: CoreIdentity;
  personalityLayers: PersonalityLayers;
  emotionalPatterns: EmotionalPatterns;
  defenceMechanisms: DefenseMechanisms;
  internalContracts: {
    title: string;
    contracts: InternalContract[];
    overallImpact: string;
  };
  capabilities: {
    title: string;
    intellectual: CapabilityCategory;
    emotional: CapabilityCategory;
    social: CapabilityCategory;
    summary: string;
  };
  limitingBeliefs: LimitingBeliefs;
  therapeuticInsights: string[];
  treatmentRecommendations: string[];
  therapeuticContract: TherapeuticContract;
}

/**
 * Client context for analysis
 */
export interface ClientContext {
  name?: string;
  age?: number;
  purpose?: string;
  [key: string]: any;
}

/**
 * Session context for AI chat
 */
export interface FuturegraphSessionContext {
  sessionId: string;
  clientId: string;
  clientContext: ClientContext;
  analysis: FuturegraphAnalysis;
  report: FuturegraphReport;
  language: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  details?: any;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
