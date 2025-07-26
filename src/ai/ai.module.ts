// src/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiChatService } from './ai-chat.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiModule {}