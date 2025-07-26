// src/ai/ai.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('chat')
  async chat(@Body() body: { message: string }) {
    const response = await this.aiChatService.getChatResponse(body.message);
    return { response };
  }
}
