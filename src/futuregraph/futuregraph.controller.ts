// src/futuregraph/futuregraph.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FuturegraphService } from './futuregraph.service';
import { AuthGuard } from '../auth/auth.guard';
import { StartSessionDto } from './dto/start-session.dto';

@Controller('ai/futuregraph')
@UseGuards(AuthGuard)
export class FuturegraphController {
  constructor(private readonly futuregraphService: FuturegraphService) {}

  /**
   * Start and complete analysis in a single operation.
   * Returns the sessionId, complete analysis, and report.
   */
  @Post('analyze')
  async analyze(@Body() startSessionDto: StartSessionDto) {
    const result = await this.futuregraphService.startAndCompleteAnalysis(startSessionDto);
    return {
      sessionId: result.sessionId,
      status: 'completed',
      analysis: result.analysis,
      report: result.report,
    };
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
   * Legacy endpoints for backward compatibility - redirect to new flow
   */
  @Post('start-session')
  async startSession(@Body() startSessionDto: StartSessionDto) {
    // Redirect to new single-round analysis
    return this.analyze(startSessionDto);
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