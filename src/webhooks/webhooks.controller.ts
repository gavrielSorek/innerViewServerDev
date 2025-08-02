// src/webhooks/webhooks.controller.ts
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
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SubscriptionPlan } from '../users/schemas/user.schema';
import { StripeWebhookService } from './stripe-webhook.service';
import { PayPalWebhookService } from './paypal-webhook.service';
import { ValidationError } from '../common/errors/custom-errors';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly stripeWebhookService: StripeWebhookService,
    private readonly paypalWebhookService: PayPalWebhookService,
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
    if (!signature) {
      throw new ValidationError('Missing stripe-signature header');
    }

    let event;
    try {
      event = this.stripeWebhookService.constructEvent(
        request.rawBody!,
        signature,
      );
    } catch (err) {
      this.logger.error('Stripe webhook signature verification failed:', err);
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
          this.logger.log(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error('Error processing Stripe webhook:', error);
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
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() request: RawBodyRequest<Request>,
  ) {
    // Verify PayPal webhook
    const isValid = await this.paypalWebhookService.verifyWebhook(headers, body);
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
          this.logger.log(`Unhandled PayPal event type: ${body.event_type}`);
      }
    } catch (error) {
      this.logger.error('Error processing PayPal webhook:', error);
    }

    return { received: true };
  }

  /**
   * Handle Stripe subscription changes
   */
  private async handleStripeSubscriptionChange(subscription: any) {
    const metadata = this.stripeWebhookService.extractSubscriptionMetadata(subscription);
    
    if (!metadata.userId) {
      this.logger.error('No firebaseUid in Stripe subscription metadata');
      return;
    }

    const plan = this.stripeWebhookService.mapPriceToSubscriptionPlan(metadata.priceId);

    await this.usersService.updateSubscriptionFromPaymentWebhook(
      metadata.userId,
      plan as SubscriptionPlan,
      'stripe',
      metadata,
    );
  }

  /**
   * Handle Stripe subscription cancellation
   */
  private async handleStripeSubscriptionCancellation(subscription: any) {
    const metadata = this.stripeWebhookService.extractSubscriptionMetadata(subscription);
    
    if (!metadata.userId) {
      return;
    }

    await this.usersService.updateSubscriptionFromPaymentWebhook(
      metadata.userId,
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
      this.logger.error('No custom_id in PayPal subscription');
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
   * Map PayPal plan IDs to subscription plans
   */
  private mapPayPalPlanToSubscriptionPlan(planId: string): SubscriptionPlan {
    const plans = this.configService.get('paypal.plans');
    
    if (planId === plans?.basic) return SubscriptionPlan.BASIC;
    if (planId === plans?.pro) return SubscriptionPlan.PRO;
    return SubscriptionPlan.FREE;
  }
}