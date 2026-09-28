import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PAYMENT_PROVIDER, PaymentProvider } from '../providers/payment-provider.interface';
import { Order } from 'src/order/entities/order.entity';
import { OrderStatus } from 'src/order/enums/order-status.enum';

@Injectable()
export class CreatePaymentUseCase {
  private readonly logger = new Logger(CreatePaymentUseCase.name);

  constructor(
    private readonly em: EntityManager,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  async execute(orderId: number, userId: number) {
    this.logger.log(`Creating payment for order ${orderId}...`);

    const payment = await this.em.transactional(async (em) => {
      const order = await em.findOne(Order, { id: orderId, user: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictException(`Order with ID ${orderId} is not awaiting payment`);
      }

      const pendingPayment = await em.findOne(Payment, { order, status: PaymentStatus.PENDING });

      if (pendingPayment) {
        return pendingPayment;
      }

      const { externalId, status, checkoutUrl } = await this.paymentProvider.createPayment(order);

      return em.create(Payment, {
        order,
        provider: this.paymentProvider.name,
        externalId,
        status,
        checkoutUrl,
        amountInCents: order.totalInCents,
      });
    });

    this.logger.log(`Payment ${payment.externalId} ready for order ${orderId}`);

    return payment;
  }
}
