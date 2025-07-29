// ============================================
// FILE 3: src/webhooks/webhooks.controller.ts
// ============================================
// CREATE this new file

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SubscriptionPlan } from '../users/schemas/user.schema';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Stripe webhook endpoint
   * Handles subscription changes from Stripe
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      throw new BadRequestException('Webhook not configured');
    }

    // Verify webhook signature
    const stripe = require('stripe')(this.configService.get<string>('STRIPE_SECRET_KEY'));
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err);
      throw new BadRequestException('Invalid signature');
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleStripeSubscriptionChange(event.data.object);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleStripeSubscriptionCancellation(event.data.object);
          break;
          
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing Stripe webhook:', error);
      // Return 200 to acknowledge receipt even if processing failed
      // This prevents Stripe from retrying
    }

    return { received: true };
  }

  /**
   * PayPal webhook endpoint
   * Handles subscription changes from PayPal
   */
  @Post('paypal')
  @HttpCode(HttpStatus.OK)
  async handlePayPalWebhook(
    @Headers() headers: any,
    @Body() body: any,
  ) {
    // Verify PayPal webhook
    const isValid = await this.verifyPayPalWebhook(headers, body);
    if (!isValid) {
      throw new BadRequestException('Invalid PayPal webhook signature');
    }

    try {
      switch (body.event_type) {
        case 'BILLING.SUBSCRIPTION.CREATED':
        case 'BILLING.SUBSCRIPTION.UPDATED':
          await this.handlePayPalSubscriptionChange(body.resource);
          break;
          
        case 'BILLING.SUBSCRIPTION.CANCELLED':
        case 'BILLING.SUBSCRIPTION.EXPIRED':
          await this.handlePayPalSubscriptionCancellation(body.resource);
          break;
          
        default:
          console.log(`Unhandled PayPal event type: ${body.event_type}`);
      }
    } catch (error) {
      console.error('Error processing PayPal webhook:', error);
    }

    return { received: true };
  }

  /**
   * Handle Stripe subscription changes
   */
  private async handleStripeSubscriptionChange(subscription: any) {
    // Extract user ID from Stripe metadata
    const userId = subscription.metadata?.firebaseUid;
    if (!userId) {
      console.error('No firebaseUid in Stripe subscription metadata');
      return;
    }

    // Map Stripe price ID to our subscription plan
    const plan = this.mapStripePriceToSubscriptionPlan(
      subscription.items.data[0].price.id,
    );

    await this.usersService.updateSubscriptionFromPaymentWebhook(
      userId,
      plan,
      'stripe',
      {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        priceId: subscription.items.data[0].price.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      },
    );
  }

  /**
   * Handle Stripe subscription cancellation
   */
  private async handleStripeSubscriptionCancellation(subscription: any) {
    const userId = subscription.metadata?.firebaseUid;
    if (!userId) {
      return;
    }

    await this.usersService.updateSubscriptionFromPaymentWebhook(
      userId,
      SubscriptionPlan.FREE,
      'stripe',
      {
        subscriptionId: subscription.id,
        canceledAt: subscription.canceled_at,
        endedAt: subscription.ended_at,
      },
    );
  }

  /**
   * Handle PayPal subscription changes
   */
  private async handlePayPalSubscriptionChange(subscription: any) {
    // Extract user ID from PayPal custom_id
    const userId = subscription.custom_id;
    if (!userId) {
      console.error('No custom_id in PayPal subscription');
      return;
    }

    // Map PayPal plan ID to our subscription plan
    const plan = this.mapPayPalPlanToSubscriptionPlan(subscription.plan_id);

    await this.usersService.updateSubscriptionFromPaymentWebhook(
      userId,
      plan,
      'paypal',
      {
        subscriptionId: subscription.id,
        planId: subscription.plan_id,
        status: subscription.status,
        nextBillingTime: subscription.billing_info?.next_billing_time,
      },
    );
  }

  /**
   * Handle PayPal subscription cancellation
   */
  private async handlePayPalSubscriptionCancellation(subscription: any) {
    const userId = subscription.custom_id;
    if (!userId) {
      return;
    }

    await this.usersService.updateSubscriptionFromPaymentWebhook(
      userId,
      SubscriptionPlan.FREE,
      'paypal',
      {
        subscriptionId: subscription.id,
        status: subscription.status,
      },
    );
  }

  /**
   * Map Stripe price IDs to subscription plans
   */
  private mapStripePriceToSubscriptionPlan(priceId: string): SubscriptionPlan {
    // Use string literals to avoid computed property issues
    const basicPriceId = this.configService.get<string>('STRIPE_PRICE_BASIC');
    const proPriceId = this.configService.get<string>('STRIPE_PRICE_PRO');

    if (priceId === basicPriceId) return SubscriptionPlan.BASIC;
    if (priceId === proPriceId) return SubscriptionPlan.PRO;
    return SubscriptionPlan.FREE;
  }

  /**
   * Map PayPal plan IDs to subscription plans
   */
  private mapPayPalPlanToSubscriptionPlan(planId: string): SubscriptionPlan {
    // Use string literals to avoid computed property issues
    const basicPlanId = this.configService.get<string>('PAYPAL_PLAN_BASIC');
    const proPlanId = this.configService.get<string>('PAYPAL_PLAN_PRO');

    if (planId === basicPlanId) return SubscriptionPlan.BASIC;
    if (planId === proPlanId) return SubscriptionPlan.PRO;
    return SubscriptionPlan.FREE;
  }

  /**
   * Verify PayPal webhook signature
   */
  private async verifyPayPalWebhook(headers: any, body: any): Promise<boolean> {
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');
    const cert = headers['paypal-cert-url'];
    const signature = headers['paypal-transmission-sig'];
    const transmissionId = headers['paypal-transmission-id'];
    const timestamp = headers['paypal-transmission-time'];
    const algo = headers['paypal-auth-algo'];

    // In production, implement proper PayPal webhook verification
    // This is a simplified example
    if (!webhookId || !cert || !signature) {
      return false;
    }

    // TODO: Implement actual PayPal webhook verification
    // See: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
    
    return true; // Placeholder - implement proper verification
  }
}
