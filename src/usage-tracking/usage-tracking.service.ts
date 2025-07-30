// src/usage-tracking/usage-tracking.service.ts
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UsageTracking,
  UsageTrackingDocument,
  UsageType,
} from './schemas/usage-tracking.schema';
import { UsersService } from '../users/users.service';
import { SubscriptionPlan } from '../users/schemas/user.schema';
import {
  SUBSCRIPTION_LIMITS,
  USAGE_LIMIT_MESSAGES,
  SubscriptionLimits,
} from '../config/subscription-limits.config';

@Injectable()
export class UsageTrackingService {
  constructor(
    @InjectModel(UsageTracking.name)
    private usageTrackingModel: Model<UsageTrackingDocument>,
    private usersService: UsersService,
  ) {}

  /**
   * Track a usage event
   */
  async trackUsage(
    userId: string,
    usageType: UsageType,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UsageTracking> {
    const usage = new this.usageTrackingModel({
      userId,
      usageType,
      timestamp: new Date(),
      metadata,
      ipAddress,
      userAgent,
    });

    return usage.save();
  }

  /**
   * Check if user has exceeded their usage limit
   */
  async checkUsageLimit(
    userId: string,
    usageType: UsageType,
  ): Promise<{
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
    resetDate: Date;
    message?: string;
    upgradePrompt?: string;
  }> {
    const user = await this.usersService.findOne(userId);
    const limits = SUBSCRIPTION_LIMITS[user.subscription];
    const limit = this.getLimit(limits, usageType);

    // Calculate rolling 30-day window
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count usage in the last 30 days
    const used = await this.usageTrackingModel.countDocuments({
      userId,
      usageType,
      timestamp: { $gte: thirtyDaysAgo },
    });

    const remaining = Math.max(0, limit - used);
    const allowed = used < limit;

    // Calculate when the oldest usage will expire (reset date)
    const oldestUsage = await this.usageTrackingModel
      .findOne({
        userId,
        usageType,
        timestamp: { $gte: thirtyDaysAgo },
      })
      .sort({ timestamp: 1 })
      .exec();

    const resetDate = oldestUsage
      ? new Date(oldestUsage.timestamp.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date();

    let message: string | undefined;
    let upgradePrompt: string | undefined;

    if (!allowed) {
      const feature = usageType === UsageType.FUTUREGRAPH_ANALYZE
        ? 'FutureGraph analysis'
        : 'AI chat';
      
      message = USAGE_LIMIT_MESSAGES.limitReached(
        feature,
        limit,
        user.subscription,
      );

      if (user.subscription === SubscriptionPlan.FREE) {
        upgradePrompt = USAGE_LIMIT_MESSAGES.upgradePrompt('FREE', 'BASIC');
      } else if (user.subscription === SubscriptionPlan.BASIC) {
        upgradePrompt = USAGE_LIMIT_MESSAGES.upgradePrompt('BASIC', 'PRO');
      }
    } else if (remaining <= limit * 0.2) {
      // Warning when 80% of limit is used
      const feature = usageType === UsageType.FUTUREGRAPH_ANALYZE
        ? 'FutureGraph analysis'
        : 'AI chat';
      
      message = USAGE_LIMIT_MESSAGES.approachingLimit(feature, used, limit);
    }

    return {
      allowed,
      used,
      limit,
      remaining,
      resetDate,
      message,
      upgradePrompt,
    };
  }

  /**
   * Enforce usage limit - throws exception if limit exceeded
   */
  async enforceUsageLimit(
    userId: string,
    usageType: UsageType,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const limitCheck = await this.checkUsageLimit(userId, usageType);

    if (!limitCheck.allowed) {
      throw new ForbiddenException({
        error: 'USAGE_LIMIT_EXCEEDED',
        message: limitCheck.message,
        upgradePrompt: limitCheck.upgradePrompt,
        usage: {
          used: limitCheck.used,
          limit: limitCheck.limit,
          resetDate: limitCheck.resetDate,
        },
      });
    }

    // Track the usage
    await this.trackUsage(userId, usageType, metadata, ipAddress, userAgent);

    // Return warning if approaching limit
    if (limitCheck.message && limitCheck.remaining <= 3) {
      console.warn(`User ${userId} approaching ${usageType} limit: ${limitCheck.message}`);
    }
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsageStats(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    subscription: SubscriptionPlan;
    limits: SubscriptionLimits;
    usage: {
      futuregraphAnalyze: {
        used: number;
        limit: number;
        remaining: number;
        percentage: number;
        resetDate: Date;
      };
      aiChat: {
        used: number;
        limit: number;
        remaining: number;
        percentage: number;
        resetDate: Date;
      };
    };
    history?: {
      daily: Record<string, { futuregraphAnalyze: number; aiChat: number }>;
      total: { futuregraphAnalyze: number; aiChat: number };
    };
  }> {
    const user = await this.usersService.findOne(userId);
    const limits = SUBSCRIPTION_LIMITS[user.subscription];

    // Get current usage (rolling 30-day window)
    const [futuregraphCheck, aiChatCheck] = await Promise.all([
      this.checkUsageLimit(userId, UsageType.FUTUREGRAPH_ANALYZE),
      this.checkUsageLimit(userId, UsageType.AI_CHAT),
    ]);

    const result: any = {
      subscription: user.subscription,
      limits,
      usage: {
        futuregraphAnalyze: {
          used: futuregraphCheck.used,
          limit: futuregraphCheck.limit,
          remaining: futuregraphCheck.remaining,
          percentage: Math.round((futuregraphCheck.used / futuregraphCheck.limit) * 100),
          resetDate: futuregraphCheck.resetDate,
        },
        aiChat: {
          used: aiChatCheck.used,
          limit: aiChatCheck.limit,
          remaining: aiChatCheck.remaining,
          percentage: Math.round((aiChatCheck.used / aiChatCheck.limit) * 100),
          resetDate: aiChatCheck.resetDate,
        },
      },
    };

    // Get historical data if requested
    if (startDate && endDate) {
      const history = await this.getUsageHistory(userId, startDate, endDate);
      result.history = history;
    }

    return result;
  }

  /**
   * Get detailed usage history
   */
  private async getUsageHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    daily: Record<string, { futuregraphAnalyze: number; aiChat: number }>;
    total: { futuregraphAnalyze: number; aiChat: number };
  }> {
    const usageData = await this.usageTrackingModel
      .find({
        userId,
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ timestamp: 1 })
      .exec();

    const daily: Record<string, { futuregraphAnalyze: number; aiChat: number }> = {};
    let totalFuturegraph = 0;
    let totalAiChat = 0;

    usageData.forEach((usage) => {
      const date = usage.timestamp.toISOString().split('T')[0];
      
      if (!daily[date]) {
        daily[date] = { futuregraphAnalyze: 0, aiChat: 0 };
      }

      if (usage.usageType === UsageType.FUTUREGRAPH_ANALYZE) {
        daily[date].futuregraphAnalyze++;
        totalFuturegraph++;
      } else if (usage.usageType === UsageType.AI_CHAT) {
        daily[date].aiChat++;
        totalAiChat++;
      }
    });

    return {
      daily,
      total: {
        futuregraphAnalyze: totalFuturegraph,
        aiChat: totalAiChat,
      },
    };
  }

  /**
   * Get usage breakdown by time period
   */
  async getUsageBreakdown(
    userId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 30,
  ): Promise<any[]> {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'hour':
        startDate.setHours(now.getHours() - limit);
        break;
      case 'day':
        startDate.setDate(now.getDate() - limit);
        break;
      case 'week':
        startDate.setDate(now.getDate() - limit * 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - limit);
        break;
    }

    const aggregation = await this.usageTrackingModel.aggregate([
      {
        $match: {
          userId,
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            period: {
              $dateToString: {
                format: period === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
                date: '$timestamp',
              },
            },
            usageType: '$usageType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.period': 1 },
      },
    ]);

    return aggregation;
  }

  /**
   * Helper to get limit based on usage type
   */
  private getLimit(limits: SubscriptionLimits, usageType: UsageType): number {
    switch (usageType) {
      case UsageType.FUTUREGRAPH_ANALYZE:
        return limits.futuregraphAnalyze;
      case UsageType.AI_CHAT:
        return limits.aiChat;
      default:
        throw new BadRequestException('Invalid usage type');
    }
  }
}