// src/futuregraph/futuregraph.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import { FuturegraphService } from './futuregraph.service';
import { AuthGuard } from '../auth/auth.guard';
import { StartSessionDto } from './dto/start-session.dto';
import { SubscriptionPlan } from '../users/schemas/user.schema';
import { SubscriptionGuard, RequireSubscription} from '../common/guards/subscription.guard';
import { UsageTrackingService } from '../usage-tracking/usage-tracking.service';
import { UsageType } from '../usage-tracking/schemas/usage-tracking.schema';

@Controller('ai/futuregraph')
@UseGuards(AuthGuard)
export class FuturegraphController {
  constructor(
    private readonly futuregraphService: FuturegraphService,
    private readonly usageTrackingService: UsageTrackingService,
  ) {}

  /**
   * Start and complete analysis in a single operation.
   * Returns the sessionId, complete analysis, and report.
   */
  @Post('analyze')
  async analyze(
    @Request() req: any,
    @Body() startSessionDto: StartSessionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;
    
    // Override userId in DTO with authenticated user
    startSessionDto = { ...startSessionDto, userId };
    
    // Check and enforce usage limit
    await this.usageTrackingService.enforceUsageLimit(
      userId,
      UsageType.FUTUREGRAPH_ANALYZE,
      {
        clientId: startSessionDto.clientId,
        language: startSessionDto.language,
      },
      ip,
      userAgent,
    );
    
    // Process the analysis
    const startTime = Date.now();
    const result = await this.futuregraphService.startAndCompleteAnalysis(startSessionDto);
    const responseTime = Date.now() - startTime;
    
    // Track additional metadata
    await this.usageTrackingService.trackUsage(
      userId,
      UsageType.FUTUREGRAPH_ANALYZE,
      {
        sessionId: result.sessionId,
        clientId: startSessionDto.clientId,
        responseTime,
        success: true,
      },
    );
    
    // Get updated usage stats
    const usageCheck = await this.usageTrackingService.checkUsageLimit(
      userId,
      UsageType.FUTUREGRAPH_ANALYZE,
    );
    
    // Include usage info in response
    const response: any = {
      sessionId: result.sessionId,
      status: 'completed',
      analysis: result.analysis,
      report: result.report,
    };
    
    if (usageCheck.remaining <= 1 || usageCheck.message) {
      response.usage = {
        remaining: usageCheck.remaining,
        limit: usageCheck.limit,
        message: usageCheck.message,
        upgradePrompt: usageCheck.upgradePrompt,
      };
    }
    
    return response;
  }

  /**
   * Retrieve a completed analysis session including the handwriting image.
   * This endpoint allows retrieval of stored analyses with their images.
   */
  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const result = await this.futuregraphService.getAnalysisSession(sessionId);
    return {
      sessionId: result.session.sessionId,
      clientId: result.session.clientId,
      createdAt: result.session.startTime,
      completedAt: result.session.completedAt,
      language: result.session.language,
      status: result.session.status,
      handwritingImage: result.handwritingImage,
      analysis: result.analysis,
      report: result.report,
    };
  }

  /**
   * Get all analysis sessions for a specific client.
   * Returns a list of session summaries without the full analysis data.
   */
  @Get('client/:clientId')
  async getClientAnalyses(
    @Param('clientId') clientId: string,
    @Query('userId') userId: string,
  ) {
    const sessions = await this.futuregraphService.getClientAnalyses(clientId, userId);
    return {
      clientId,
      sessions,
      total: sessions.length,
    };
  }

  /**
   * Check usage limits before attempting analysis
   */
  @Get('check-usage')
  async checkUsage(@Request() req: any) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;
    
    const usageCheck = await this.usageTrackingService.checkUsageLimit(
      userId,
      UsageType.FUTUREGRAPH_ANALYZE,
    );
    
    return {
      canAnalyze: usageCheck.allowed,
      usage: {
        used: usageCheck.used,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        resetDate: usageCheck.resetDate,
      },
      message: usageCheck.message,
      upgradePrompt: usageCheck.upgradePrompt,
    };
  }

  /**
   * Legacy endpoints for backward compatibility - redirect to new flow
   */
  @Post('start-session')
  async startSession(
    @Request() req: any,
    @Body() startSessionDto: StartSessionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    // Redirect to new single-round analysis
    return this.analyze(req, startSessionDto, ip, userAgent);
  }

  @Post('process-round')
  async processRound() {
    return {
      message: 'This endpoint is deprecated. Use POST /ai/futuregraph/analyze instead.',
      deprecated: true,
    };
  }

  @Get('status/:sessionId')
  async getStatus(@Param('sessionId') sessionId: string) {
    // Redirect to get session endpoint
    const result = await this.futuregraphService.getAnalysisSession(sessionId);
    return {
      sessionId: result.session.sessionId,
      status: result.session.status,
      isComplete: result.session.status === 'completed',
    };
  }

  @Get('report/:sessionId')
  async getReport(@Param('sessionId') sessionId: string) {
    const result = await this.futuregraphService.getAnalysisSession(sessionId);
    return result.report;
  }
}