import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentEvent } from '../providers/payment-provider.interface';
import { Order } from 'src/order/entities/order.entity';
import { OrderStatus } from 'src/order/enums/order-status.enum';
import { OrderService } from 'src/order/order.service';

@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  constructor(
    private readonly em: EntityManager,
    private readonly orderService: OrderService,
  ) {}

  async execute({ externalId, status }: PaymentEvent) {
    this.logger.log(`Received ${status} for payment ${externalId}`);

    const processed = await this.em.transactional(async (em) => {
      const payment = await em.findOne(Payment, { externalId }, { lockMode: LockMode.PESSIMISTIC_WRITE });

      if (!payment) {
        throw new NotFoundException(`Payment ${externalId} not found`);
      }

      if (payment.status !== PaymentStatus.PENDING) {
        return payment;
      }

      const order = await em.findOneOrFail(Order, { id: payment.order.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });

      if (status === PaymentStatus.APPROVED) {
        this.approve(payment, order);
      } else {
        await this.reject(em, payment, order);
      }

      return payment;
    });

    this.logger.log(`Payment ${externalId} is ${processed.status}`);

    return processed;
  }

  private approve(payment: Payment, order: Order) {
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      payment.status = PaymentStatus.REFUNDED;
      return;
    }

    payment.status = PaymentStatus.APPROVED;
    order.status = OrderStatus.PAID;
  }

  private async reject(em: EntityManager, payment: Payment, order: Order) {
    payment.status = PaymentStatus.REJECTED;

    if (order.status === OrderStatus.PENDING_PAYMENT) {
      await this.orderService.cancel(em, order);
    }
  }
}
