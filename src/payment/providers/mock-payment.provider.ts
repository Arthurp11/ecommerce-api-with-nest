import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, timingSafeEqual } from 'crypto';
import { PaymentStatus } from '../enums/payment-status.enum';
import { CreatedPayment, PaymentEvent, PaymentProvider, WebhookHeaders } from './payment-provider.interface';

const WEBHOOK_STATUSES = [PaymentStatus.APPROVED, PaymentStatus.REJECTED];

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  constructor(private readonly configService: ConfigService) {}

  async createPayment(): Promise<CreatedPayment> {
    return { externalId: `mock_${randomUUID()}`, status: PaymentStatus.PENDING };
  }

  parseWebhook(body: unknown, headers: WebhookHeaders): PaymentEvent {
    this.verifySecret(headers['x-webhook-secret']);

    const { externalId, status } = (body ?? {}) as Partial<PaymentEvent>;

    if (typeof externalId !== 'string' || !status || !WEBHOOK_STATUSES.includes(status)) {
      throw new BadRequestException('Invalid webhook payload');
    }

    return { externalId, status };
  }

  private verifySecret(header: string | string[] | undefined) {
    const received = Buffer.from(String(header ?? ''));
    const expected = Buffer.from(this.configService.getOrThrow<string>('PAYMENT_WEBHOOK_SECRET'));

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }
}
