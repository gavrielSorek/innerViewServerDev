// src/usage-tracking/dto/index.ts
export interface UsageStatsResponse {
  subscription: string;
  limits: {
    futuregraphAnalyze: number;
    aiChat: number;
  };
  usage: {
    futuregraphAnalyze: UsageDetail;
    aiChat: UsageDetail;
  };
  message?: string;
  history?: UsageHistory;
}

export interface UsageDetail {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  resetDate: Date;
}

export interface UsageHistory {
  daily: Record<string, { futuregraphAnalyze: number; aiChat: number }>;
  total: { futuregraphAnalyze: number; aiChat: number };
}

export interface UsageLimitCheckResponse {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetDate: Date;
  message?: string;
  upgradePrompt?: string;
}

export interface UsageBreakdownResponse {
  period: 'hour' | 'day' | 'week' | 'month';
  breakdown: Array<{
    _id: {
      period: string;
      usageType: string;
    };
    count: number;
  }>;
}