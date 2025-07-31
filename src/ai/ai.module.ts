// src/ai/ai.module.ts
// Module for AI chat functionality with FutureGraph integration.
// This module now imports FuturegraphModule to enable session context
// in chat responses.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiChatService } from './ai-chat.service';
import { LanguageService } from '../common/language.service';
import { UsageTrackingModule } from '../usage-tracking/usage-tracking.module';
import { FuturegraphModule } from '../futuregraph/futuregraph.module';

@Module({
  imports: [
    ConfigModule, 
    UsageTrackingModule,
    FuturegraphModule, // Added to access FuturegraphService
  ],
  controllers: [AiController],
  providers: [AiChatService, LanguageService],
  exports: [AiChatService],
})
export class AiModule {}