// src/ai/ai.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request,
  Ip,
  Headers,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { AuthGuard } from '../auth/auth.guard';
import { UsageTrackingService } from '../usage-tracking/usage-tracking.service';
import { UsageType } from '../usage-tracking/schemas/usage-tracking.schema';
import { FuturegraphService } from '../futuregraph/futuregraph.service';
import { 
  FuturegraphSessionContext,
  AuthenticatedRequest,
  ErrorResponse 
} from '../common/types';
import { ValidationError } from '../common/errors/custom-errors';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(
    private readonly aiChatService: AiChatService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly futuregraphService: FuturegraphService,
  ) {}

  @Post('chat')
  async chat(
    @Request() req: AuthenticatedRequest,
    @Body() body: { 
      message: string; 
      language?: string;
      sessionId?: string; // Optional FutureGraph session ID
    },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<{ response: string; usage?: any }> {
    const userId: string = req.user?.uid || req.user?.dbUser?.firebaseUid;
    if (!userId) throw new ValidationError('Missing user authentication.');

    let sessionContext: FuturegraphSessionContext | undefined = undefined;

    // 1. Validate sessionId and fetch context if provided
    if (body.sessionId) {
      let sessionData;
      try {
        sessionData = await this.futuregraphService.getAnalysisSession(
          body.sessionId,
          false // Don't include image
        );
      } catch (error) {
        throw new ValidationError('Invalid session ID');
      }

      if (
        !sessionData ||
        !sessionData.session ||
        sessionData.session.userId !== userId
      ) {
        throw new NotFoundException('Session not found');
      }

      sessionContext = {
        sessionId: body.sessionId,
        clientId: sessionData.session.clientId,
        clientContext: sessionData.session.clientContext ?? {}, // Always provide an object
        analysis: sessionData.analysis,
        report: sessionData.report,
        language: sessionData.session.language,
      };

      // Use session language if not specified in request
      if (!body.language && sessionContext.language) {
        body.language = sessionContext.language;
      }
    }

    // 2. Check and enforce usage limit
    await this.usageTrackingService.enforceUsageLimit(
      userId,
      UsageType.AI_CHAT,
      {
        messageLength: body.message.length,
        language: body.language,
        sessionId: body.sessionId,
      },
      ip,
      userAgent,
    );

    // 3. Process the chat request with optional session context
    const startTime = Date.now();
    const response: string = await this.aiChatService.getChatResponse(
      body.message,
      body.language,
      sessionContext,
    );
    const responseTime = Date.now() - startTime; // For logging or performance metrics

    // 4. Get updated usage stats
    const usageCheck = await this.usageTrackingService.checkUsageLimit(
      userId,
      UsageType.AI_CHAT,
    );

    // 5. Build and return response
    const result: { response: string; usage?: any } = { response };
    if (usageCheck.remaining <= 5 || usageCheck.message) {
      result.usage = {
        remaining: usageCheck.remaining,
        limit: usageCheck.limit,
        message: usageCheck.message,
      };
    }

    return result;
  }
}