import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import type { StripeConfig } from '@/config/configuration';
import { OrdersService } from '@/modules/orders/orders.service';
import { CartService } from '@/modules/cart/cart.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe.Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
  ) {
    const stripeCfg = this.config.get<StripeConfig>('stripe');
    if (stripeCfg?.secretKey) {
      this.stripe = new Stripe(stripeCfg.secretKey);
    } else {
      this.logger.warn('Stripe secret key not configured — payment features disabled.');
    }
  }

  async createPaymentIntent(userId: string): Promise<{ clientSecret: string; amount: number }> {
    if (!this.stripe) throw new BadRequestException('Stripe is not configured');
    const cart = await this.cartService.getCart(userId);
    const subtotal = cart.items.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
    const shippingFee = subtotal >= 5000 ? 0 : 350;
    const amount = Math.round((subtotal + shippingFee) * 100);
    const intent = await this.stripe.paymentIntents.create({
      amount,
      currency: 'lkr',
      metadata: { userId },
    });
    return { clientSecret: intent.client_secret!, amount };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe) return;
    const cfg = this.config.get<StripeConfig>('stripe');
    if (!cfg?.webhookSecret) return;

    let event: ReturnType<Stripe.Stripe['webhooks']['constructEvent']>;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, cfg.webhookSecret);
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${String(err)}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as { id: string };
        await this.ordersService.updatePaymentStatus(intent.id, 'paid');
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as { id: string };
        await this.ordersService.updatePaymentStatus(intent.id, 'failed');
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as { payment_intent?: string | null };
        if (charge.payment_intent) {
          await this.ordersService.updatePaymentStatus(charge.payment_intent, 'refunded');
        }
        break;
      }
      default:
        break;
    }
  }
}
