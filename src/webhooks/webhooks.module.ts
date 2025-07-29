// ============================================
// FILE 4: src/webhooks/webhooks.module.ts
// ============================================
// CREATE this new file

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
