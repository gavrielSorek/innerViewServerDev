// src/ai/ai.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { AuthGuard } from '../auth/auth.guard';
import { UsageTrackingService } from '../usage-tracking/usage-tracking.service';
import { UsageType } from '../usage-tracking/schemas/usage-tracking.schema';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(
    private readonly aiChatService: AiChatService,
    private readonly usageTrackingService: UsageTrackingService,
  ) {}

  @Post('chat')
  async chat(
    @Request() req: any,
    @Body() body: { message: string; language?: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<{ response: string; usage?: any }> {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;
    
    // Check and enforce usage limit
    await this.usageTrackingService.enforceUsageLimit(
      userId,
      UsageType.AI_CHAT,
      {
        messageLength: body.message.length,
        language: body.language,
      },
      ip,
      userAgent,
    );
    
    // Process the chat request
    const startTime = Date.now();
    const response = await this.aiChatService.getChatResponse(
      body.message,
      body.language,
    );
    const responseTime = Date.now() - startTime;
    
    // Get updated usage stats
    const usageCheck = await this.usageTrackingService.checkUsageLimit(
      userId,
      UsageType.AI_CHAT,
    );
    
    // Include usage info in response if approaching limit
    const result: any = { response };
    
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