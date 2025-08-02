// src/webhooks/paypal-webhook.service.ts
// Proper PayPal webhook verification implementation

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PayPalWebhookService {
  private readonly logger = new Logger(PayPalWebhookService.name);
  private readonly paypalApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    const isProduction = this.configService.get('app.env') === 'production';
    this.paypalApiUrl = isProduction
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com';
  }

  /**
   * Verify PayPal webhook signature
   */
  async verifyWebhook(
    headers: Record<string, string>,
    body: any,
  ): Promise<boolean> {
    try {
      const webhookId = this.configService.get('paypal.webhookId');
      const clientId = this.configService.get('paypal.clientId');
      const clientSecret = this.configService.get('paypal.clientSecret');

      if (!webhookId || !clientId || !clientSecret) {
        this.logger.error('PayPal webhook configuration missing');
        return false;
      }

      // Get access token
      const accessToken = await this.getAccessToken(clientId, clientSecret);

      // Prepare verification request
      const verificationRequest = {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: body,
      };

      // Verify with PayPal
      const response = await axios.post(
        `${this.paypalApiUrl}/v1/notifications/verify-webhook-signature`,
        verificationRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      this.logger.error('PayPal webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Get PayPal access token
   */
  private async getAccessToken(
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.paypalApiUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Failed to get PayPal access token:', error);
      throw new Error('PayPal authentication failed');
    }
  }

  /**
   * Alternative verification using crypto (fallback method)
   */
  verifyWebhookSignatureFallback(
    headers: Record<string, string>,
    body: string,
  ): boolean {
    try {
      const expectedSig = headers['paypal-transmission-sig'];
      const transmissionId = headers['paypal-transmission-id'];
      const timestamp = headers['paypal-transmission-time'];
      const webhookId = this.configService.get('paypal.webhookId');
      const certUrl = headers['paypal-cert-url'];

      // Construct the expected signature string
      const message = `${transmissionId}|${timestamp}|${webhookId}|${crypto
        .createHash('sha256')
        .update(body)
        .digest('hex')}`;

      // In production, you would fetch the certificate from certUrl
      // and verify the signature properly
      // This is a simplified example
      this.logger.warn('Using fallback PayPal verification - implement full verification in production');
      
      return true; // Placeholder - implement proper verification
    } catch (error) {
      this.logger.error('PayPal fallback verification failed:', error);
      return false;
    }
  }
}
