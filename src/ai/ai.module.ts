// Module for simple AI chat functionality unrelated to FutureGraph.  This
// registers the controller and service and exposes the service for use in
// other modules.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiChatService } from './ai-chat.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiModule {}
