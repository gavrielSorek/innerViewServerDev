// src/futuregraph/futuregraph.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
  Ip,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FuturegraphService } from './futuregraph.service';
import { AuthGuard } from '../auth/auth.guard';
import { StartSessionDto } from './dto/start-session.dto';
import { SubscriptionPlan } from '../users/schemas/user.schema';
import { SubscriptionGuard, RequireSubscription } from '../common/guards/subscription.guard';
import { UsageTrackingService } from '../usage-tracking/usage-tracking.service';
import { UsageType } from '../usage-tracking/schemas/usage-tracking.schema';
import { FocusAnalysisDto } from './dto/focus-analysis.dto';

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
   * Retrieve a completed analysis session.
   * Optionally include the handwriting image when the `includeImage` query
   * parameter is truthy ("true", "1" or "yes"). Without this parameter the
   * image is omitted, significantly reducing response size.
   */
  @Get('session/:sessionId')
  async getSession(
    @Param('sessionId') sessionId: string,
    @Query('includeImage') includeImage?: string,
  ) {
    // interpret includeImage flag; accept common truthy values
    const include = ['true', '1', 'yes'].includes((includeImage ?? '').toLowerCase());
    const result = await this.futuregraphService.getAnalysisSession(sessionId, include);
    const response: any = {
      sessionId: result.session.sessionId,
      clientId: result.session.clientId,
      createdAt: result.session.startTime,
      completedAt: result.session.completedAt,
      language: result.session.language,
      status: result.session.status,
      analysis: result.analysis,
      report: result.report,
    };
    if (include && result.handwritingImage) {
      response.handwritingImage = result.handwritingImage;
    }
    return response;
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
   * Create or retrieve a focused analysis report
   */
  @Post('focus')
  async focusAnalysis(
    @Request() req: any,
    @Body() body: FocusAnalysisDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    try {
      // Track usage for focus analysis (counts as a FutureGraph analysis)
      await this.usageTrackingService.enforceUsageLimit(
        userId,
        UsageType.FUTUREGRAPH_ANALYZE,
        {
          sessionId: body.sessionId,
          focus: body.focus,
          language: body.language,
          type: 'focus_analysis',
        },
        ip,
        userAgent,
      );

      const startTime = Date.now();
      
      // Create or retrieve focused analysis
      const result = await this.futuregraphService.createFocusedAnalysis(
        body.sessionId,
        body.focus,
        body.language,
        userId,
      );

      const responseTime = Date.now() - startTime;

      // Track successful completion
      await this.usageTrackingService.trackUsage(
        userId,
        UsageType.FUTUREGRAPH_ANALYZE,
        {
          focusReportId: result.focusReportId,
          sessionId: body.sessionId,
          focus: body.focus,
          responseTime,
          success: true,
          type: 'focus_analysis',
        },
      );

      // Get updated usage stats
      const usageCheck = await this.usageTrackingService.checkUsageLimit(
        userId,
        UsageType.FUTUREGRAPH_ANALYZE,
      );

      // Format response similar to analyze endpoint
      const response: any = {
        focusReportId: result.focusReportId,
        sessionId: body.sessionId,
        focus: body.focus,
        language: body.language,
        status: 'completed',
        analysis: result.analysis,
        report: result.report,
      };

      // Include usage info if approaching limit
      if (usageCheck.remaining <= 1 || usageCheck.message) {
        response.usage = {
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
          message: usageCheck.message,
          upgradePrompt: usageCheck.upgradePrompt,
        };
      }

      return response;
    } catch (error) {
      // Handle known errors
      if (error.status === 404) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.status === 403) {
        throw error; // Usage limit exceeded
      }
      // Handle other potential errors
      throw new HttpException(
        'An error occurred while processing the focus analysis.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all focus reports for the current user
   */
  @Get('my-focus-reports')
  async getMyFocusReports(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;
    const reportLimit = limit ? parseInt(limit, 10) : 20;

    const reports = await this.futuregraphService.getUserFocusReports(
      userId,
      reportLimit,
    );

    return {
      userId,
      reports,
      total: reports.length,
    };
  }

  /**
   * Get focus reports for a specific session
   */
  @Get('session/:sessionId/focus-reports')
  async getSessionFocusReports(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const reports = await this.futuregraphService.getSessionFocusReports(
      sessionId,
      userId,
    );

    return {
      sessionId,
      reports,
      total: reports.length,
    };
  }

  /**
   * Get a specific focus report by ID
   */
  @Get('focus-report/:focusReportId')
  async getFocusReport(
    @Request() req: any,
    @Param('focusReportId') focusReportId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const report = await this.futuregraphService.getFocusReportById(
      focusReportId,
      userId,
    );

    return report;
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
    // Redirect to get session endpoint without image
    const result = await this.futuregraphService.getAnalysisSession(sessionId, false);
    return {
      sessionId: result.session.sessionId,
      status: result.session.status,
      isComplete: result.session.status === 'completed',
    };
  }

  @Get('report/:sessionId')
  async getReport(@Param('sessionId') sessionId: string) {
    const result = await this.futuregraphService.getAnalysisSession(sessionId, false);
    return result.report;
  }

  /**
   * Legacy focus endpoint - kept for backward compatibility
   */
  @Get('focus')
  async focusAnalysisLegacy(@Query() query: FocusAnalysisDto) {
    try {
      const focusedAnalysis = await this.futuregraphService.getFocusedAnalysis(
        query.sessionId,
        query.focus,
        query.language,
      );
      return focusedAnalysis;
    } catch (error) {
      // Handle known errors, like session not found
      if (error.status === 404) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      // Handle other potential errors
      throw new HttpException(
        'An error occurred while processing the focus analysis.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a single analysis session
   */
  @Delete('session/:sessionId')
  async deleteSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const result = await this.futuregraphService.deleteSession(
      sessionId,
      userId,
    );

    if (!result.sessionDeleted && result.error) {
      throw new HttpException(
        result.error,
        result.error.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST,
      );
    }

    return {
      success: result.sessionDeleted,
      message: result.sessionDeleted 
        ? 'Session and associated data deleted successfully' 
        : 'Failed to delete session',
      details: result,
    };
  }

  /**
   * Delete a single focus report
   */
  @Delete('focus-report/:focusReportId')
  async deleteFocusReport(
    @Request() req: any,
    @Param('focusReportId') focusReportId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const result = await this.futuregraphService.deleteFocusReport(
      focusReportId,
      userId,
    );

    if (!result.deleted && result.error) {
      throw new HttpException(
        result.error,
        result.error.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST,
      );
    }

    return {
      success: result.deleted,
      message: result.deleted 
        ? 'Focus report deleted successfully' 
        : 'Failed to delete focus report',
    };
  }

  /**
   * Delete all sessions for a specific client
   */
  @Delete('client/:clientId/sessions')
  async deleteClientSessions(
    @Request() req: any,
    @Param('clientId') clientId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const result = await this.futuregraphService.deleteClientSessions(
      clientId,
      userId,
    );

    return {
      success: result.sessionsDeleted > 0 || result.errors.length === 0,
      message: `Deleted ${result.sessionsDeleted} sessions, ${result.imagesDeleted} images, and ${result.focusReportsDeleted} focus reports for client`,
      details: result,
    };
  }

  /**
   * Delete all sessions for the current user
   */
  @Delete('all-sessions')
  async deleteAllUserSessions(
    @Request() req: any,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const result = await this.futuregraphService.deleteAllUserSessions(userId);

    return {
      success: result.sessionsDeleted > 0 || result.errors.length === 0,
      message: `Deleted ${result.sessionsDeleted} sessions, ${result.imagesDeleted} images, and ${result.focusReportsDeleted} focus reports`,
      details: result,
    };
  }

  /**
   * Get deletion preview for a client (counts before deletion)
   */
  @Get('client/:clientId/deletion-preview')
  async getClientDeletionPreview(
    @Request() req: any,
    @Param('clientId') clientId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const counts = await this.futuregraphService.getClientSessionCounts(
      clientId,
      userId,
    );

    return {
      message: `This client has ${counts.sessions} sessions and ${counts.focusReports} focus reports that will be deleted`,
      ...counts,
    };
  }

  /**
   * Get deletion preview for all user sessions (counts before deletion)
   */
  @Get('deletion-preview')
  async getUserDeletionPreview(
    @Request() req: any,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const counts = await this.futuregraphService.getUserSessionCounts(userId);

    return {
      message: `You have ${counts.sessions} sessions and ${counts.focusReports} focus reports across ${counts.clients} clients that will be deleted`,
      ...counts,
    };
  }
}