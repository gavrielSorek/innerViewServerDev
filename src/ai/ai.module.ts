// Module for simple AI chat functionality unrelated to FutureGraph.  This
// registers the controller and service and exposes the service for use in
// other modules.  It has been extended to include the LanguageService
// so that chat responses can be localised.


// src/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiChatService } from './ai-chat.service';
import { LanguageService } from '../common/language.service';
import { UsageTrackingModule } from '../usage-tracking/usage-tracking.module';

@Module({
  imports: [ConfigModule, UsageTrackingModule],
  controllers: [AiController],
  providers: [AiChatService, LanguageService],
  exports: [AiChatService],
})
export class AiModule {}