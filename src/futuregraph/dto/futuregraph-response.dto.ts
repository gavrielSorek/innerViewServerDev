// src/futuregraph/dto/futuregraph-response.dto.ts
// New file to define response types

export interface InternalContract {
  name: string;
  nameHebrew: string;
  description: string;
  descriptionHebrew: string;
  purpose: string;
  purposeHebrew: string;
  impact: string;
  impactHebrew: string;
}

export interface BilingualContent {
  en: string | string[];
  he: string | string[];
}

export interface CapabilityCategory {
  capabilities: string[];
  capabilitiesBilingual: BilingualContent;
  strengths: string[];
  strengthsBilingual: BilingualContent;
}

export interface FuturegraphAnalysisResponse {
  sessionId: string;
  status: 'completed' | 'processing' | 'failed';
  analysis: {
    coreIdentity: any;
    personalityLayers: any;
    defenceMechanisms: any;
    internalContracts: {
      contracts: InternalContract[];
      overallImpact: string;
      overallImpactHebrew: string;
    };
    intellectualEmotionalSocialCapabilities: {
      intellectual: {
        capabilities: string[];
        capabilitiesHebrew: string[];
        strengths: string[];
        strengthsHebrew: string[];
      };
      emotional: {
        capabilities: string[];
        capabilitiesHebrew: string[];
        strengths: string[];
        strengthsHebrew: string[];
      };
      social: {
        capabilities: string[];
        capabilitiesHebrew: string[];
        strengths: string[];
        strengthsHebrew: string[];
      };
      summary: string;
      summaryHebrew: string;
    };
    limitingBeliefs: any;
    emotionalPatterns: any;
    therapeuticInsights: string[];
    treatmentRecommendations: string[];
    therapeuticGoals: string[];
    recommendedApproach: string;
    suggestedTimeline: string;
    focusAreas: string[];
  };
  report: {
    sessionId: string;
    clientId: string;
    generatedAt: Date;
    language: string;
    executiveSummary: string;
    coreIdentity: any;
    personalityLayers: any;
    emotionalPatterns: any;
    defenceMechanisms: any;
    internalContracts: {
      title: string;
      contracts: InternalContract[];
      overallImpact: string;
      overallImpactBilingual: BilingualContent;
    };
    capabilities: {
      title: string;
      intellectual: CapabilityCategory;
      emotional: CapabilityCategory;
      social: CapabilityCategory;
      summary: string;
      summaryBilingual: BilingualContent;
    };
    limitingBeliefs: any;
    therapeuticInsights: string[];
    treatmentRecommendations: string[];
    therapeuticContract: {
      goals: string[];
      approach: string;
      timeline: string;
      focusAreas: string[];
    };
  };
  usage?: {
    remaining: number;
    limit: number;
    message?: string;
    upgradePrompt?: string;
  };
}