// src/config/subscription-limits.config.ts
import { SubscriptionPlan } from '../users/schemas/user.schema';

export interface SubscriptionLimits {
  futuregraphAnalyze: number;
  aiChat: number;
}

// Configurable limits per subscription tier
export const SUBSCRIPTION_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
  [SubscriptionPlan.FREE]: {
    futuregraphAnalyze: 3,
    aiChat: 10,
  },
  [SubscriptionPlan.BASIC]: {
    futuregraphAnalyze: 30,
    aiChat: 200,
  },
  [SubscriptionPlan.PRO]: {
    futuregraphAnalyze: 100,
    aiChat: 2000,
  },
};

// Error messages
export const USAGE_LIMIT_MESSAGES = {
  limitReached: (feature: string, limit: number, plan: string) =>
    `You've reached your ${plan} plan limit of ${limit} ${feature} requests in the last 30 days. Please upgrade to continue.`,
  
  approachingLimit: (feature: string, used: number, limit: number) =>
    `You've used ${used} out of ${limit} ${feature} requests. Consider upgrading for more usage.`,
  
  upgradePrompt: (currentPlan: string, suggestedPlan: string) =>
    `Upgrade from ${currentPlan} to ${suggestedPlan} for increased limits and more features.`,
};