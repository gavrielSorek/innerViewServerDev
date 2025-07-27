// Controller for general chat with the AI assistant.  Protected by the
// auth guard to ensure only authenticated users can access the endpoint.

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('chat')
  async chat(
    @Body() body: { message: string; language?: string },
  ): Promise<{ response: string }> {
    const response = await this.aiChatService.getChatResponse(
      body.message,
      body.language,
    );
    return { response };
  }
}