// src/usage-tracking/usage-tracking.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { UsageTrackingService } from './usage-tracking.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('usage')
@UseGuards(AuthGuard)
export class UsageTrackingController {
  constructor(private readonly usageTrackingService: UsageTrackingService) {}

  /**
   * Get current usage stats for the authenticated user
   */
  @Get('my-usage')
  async getMyUsage(@Request() req: any) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;
    
    const stats = await this.usageTrackingService.getUserUsageStats(userId);
    
    return {
      ...stats,
      message: this.generateUsageMessage(stats),
    };
  }

  /**
   * Get detailed usage history for the authenticated user
   */
  @Get('my-usage/history')
  async getMyUsageHistory(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const stats = await this.usageTrackingService.getUserUsageStats(
      userId,
      start,
      end,
    );
    
    return stats;
  }

  /**
   * Get usage breakdown by period
   */
  @Get('my-usage/breakdown')
  async getMyUsageBreakdown(
    @Request() req: any,
    @Query('period') period: 'hour' | 'day' | 'week' | 'month' = 'day',
    @Query('limit') limit: string = '30',
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;
    
    const breakdown = await this.usageTrackingService.getUsageBreakdown(
      userId,
      period,
      parseInt(limit, 10),
    );
    
    return {
      period,
      breakdown,
    };
  }

  /**
   * Check specific usage limit
   */
  @Get('check/:usageType')
  async checkUsageLimit(
    @Request() req: any,
    @Param('usageType') usageType: 'futuregraph_analyze' | 'ai_chat',
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;
    
    const limitCheck = await this.usageTrackingService.checkUsageLimit(
      userId,
      usageType as any,
    );
    
    return limitCheck;
  }

  /**
   * Helper to generate user-friendly usage message
   */
  private generateUsageMessage(stats: any): string {
    const { subscription, usage } = stats;
    
    const messages: string[] = [];
    
    // FutureGraph usage
    if (usage.futuregraphAnalyze.percentage >= 90) {
      messages.push(
        `⚠️ You've used ${usage.futuregraphAnalyze.used} of ${usage.futuregraphAnalyze.limit} FutureGraph analyses (${usage.futuregraphAnalyze.percentage}%).`
      );
    } else if (usage.futuregraphAnalyze.percentage >= 70) {
      messages.push(
        `📊 FutureGraph: ${usage.futuregraphAnalyze.remaining} analyses remaining.`
      );
    }
    
    // AI Chat usage
    if (usage.aiChat.percentage >= 90) {
      messages.push(
        `⚠️ You've used ${usage.aiChat.used} of ${usage.aiChat.limit} AI chat messages (${usage.aiChat.percentage}%).`
      );
    } else if (usage.aiChat.percentage >= 70) {
      messages.push(
        `💬 AI Chat: ${usage.aiChat.remaining} messages remaining.`
      );
    }
    
    // Upgrade prompt
    if (subscription === 'free' && (usage.futuregraphAnalyze.percentage >= 80 || usage.aiChat.percentage >= 80)) {
      messages.push(
        '🚀 Consider upgrading to BASIC for 10x more usage!'
      );
    } else if (subscription === 'basic' && (usage.futuregraphAnalyze.percentage >= 80 || usage.aiChat.percentage >= 80)) {
      messages.push(
        '🌟 Upgrade to PRO for even more analyses and unlimited potential!'
      );
    }
    
    if (messages.length === 0) {
      messages.push(`✅ You're using your ${subscription.toUpperCase()} plan wisely. Plenty of usage remaining!`);
    }
    
    return messages.join(' ');
  }
}