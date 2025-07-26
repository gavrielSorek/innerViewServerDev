// Controller responsible for exposing REST endpoints for the FutureGraph
// analysis workflow.  All routes are protected by the AuthGuard to ensure
// only authenticated therapists can initiate or process sessions.
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FuturegraphService } from './futuregraph.service';
import { AuthGuard } from '../auth/auth.guard';
import { StartSessionDto } from './dto/start-session.dto';
import { ProcessRoundDto } from './dto/process-round.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Controller('ai/futuregraph')
@UseGuards(AuthGuard)
export class FuturegraphController {
  constructor(private readonly futuregraphService: FuturegraphService) {}

  /**
   * Create a new analysis session.  Returns a unique sessionId that must
   * be passed to subsequent round-processing calls.
   */
  @Post('start-session')
  async startSession(@Body() startSessionDto: StartSessionDto) {
    const sessionId = await this.futuregraphService.startSession(startSessionDto);
    return { sessionId, status: 'Session created successfully' };
  }

  /**
   * Process a single round of analysis.  This validates the round order,
   * invokes the AI model, and persists the results.  The therapist must
   * subsequently approve or reject the round using the feedback endpoint.
   */
  @Post('process-round')
  async processRound(@Body() processRoundDto: ProcessRoundDto) {
    return this.futuregraphService.processRound(processRoundDto);
  }

  /**
   * Retrieve the current status of a session, including which rounds have
   * been completed and which require therapist approval.
   */
  @Get('status/:sessionId')
  async getStatus(@Param('sessionId') sessionId: string) {
    return this.futuregraphService.getSessionStatus(sessionId);
  }

  /**
   * Generate the final report for a completed session.  All ten rounds must
   * be completed and approved before this endpoint will succeed.
   */
  @Get('report/:sessionId')
  async getReport(@Param('sessionId') sessionId: string) {
    return this.futuregraphService.generateReport(sessionId);
  }

  /**
   * Submit therapist feedback for a specific round.  This marks the round
   * as approved or rejected and optionally records free‑form feedback.
   */
  @Post('feedback')
  async submitFeedback(@Body() submitFeedbackDto: SubmitFeedbackDto) {
    return this.futuregraphService.submitFeedback(submitFeedbackDto);
  }
}
