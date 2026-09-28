import { Order } from 'src/order/entities/order.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export type WebhookHeaders = Record<string, string | string[] | undefined>;

export interface CreatedPayment {
  externalId: string;
  status: PaymentStatus;
  checkoutUrl?: string | null;
}

export interface PaymentEvent {
  externalId: string;
  status: PaymentStatus.APPROVED | PaymentStatus.REJECTED;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(order: Order): Promise<CreatedPayment>;
  parseWebhook(body: unknown, headers: WebhookHeaders): PaymentEvent;
}
