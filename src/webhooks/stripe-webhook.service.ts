// src/webhooks/stripe-webhook.service.ts
// Stripe webhook service for better organization

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2024-11-20.acacia',
      });
    }
  }

  /**
   * Construct and verify Stripe webhook event
   */
  constructEvent(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error('Stripe webhook verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Map Stripe price ID to subscription plan
   */
  mapPriceToSubscriptionPlan(priceId: string): string {
    const prices = this.configService.get('stripe.prices');
    
    if (priceId === prices.basic) return 'basic';
    if (priceId === prices.pro) return 'pro';
    return 'free';
  }

  /**
   * Extract metadata from Stripe subscription
   */
  extractSubscriptionMetadata(subscription: Stripe.Subscription): {
    userId?: string;
    customerId: string;
    priceId: string;
    status: string;
    currentPeriodEnd: number;
  } {
    const item = subscription.items.data[0];
    
    return {
      userId: subscription.metadata?.firebaseUid,
      customerId: subscription.customer as string,
      priceId: item.price.id,
      status: subscription.status,
      currentPeriodEnd: (subscription as any).current_period_end || Date.now() / 1000,
    };
  }
}