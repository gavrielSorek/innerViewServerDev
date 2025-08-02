// src/webhooks/webhooks.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { PayPalWebhookService } from './paypal-webhook.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [WebhooksController],
  providers: [StripeWebhookService, PayPalWebhookService],
})
export class WebhooksModule {}