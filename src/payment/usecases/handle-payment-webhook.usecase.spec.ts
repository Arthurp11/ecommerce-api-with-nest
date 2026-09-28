import { NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.usecase';
import { OrderService } from 'src/order/order.service';
import { PaymentStatus } from '../enums/payment-status.enum';
import { OrderStatus } from 'src/order/enums/order-status.enum';

describe('HandlePaymentWebhookUseCase', () => {
  let useCase: HandlePaymentWebhookUseCase;
  let orderService: jest.Mocked<OrderService>;
  let tx: { findOne: jest.Mock; findOneOrFail: jest.Mock };
  let payment: any;
  let order: any;

  beforeEach(() => {
    order = { id: 5, status: OrderStatus.PENDING_PAYMENT };
    payment = { externalId: 'mock_1', status: PaymentStatus.PENDING, order: { id: 5 } };
    tx = {
      findOne: jest.fn(async () => payment),
      findOneOrFail: jest.fn(async () => order),
    };
    orderService = { cancel: jest.fn() } as unknown as jest.Mocked<OrderService>;

    const em = { transactional: jest.fn(async (cb) => cb(tx)) } as unknown as EntityManager;

    useCase = new HandlePaymentWebhookUseCase(em, orderService);
  });

  it('throws NotFoundException for an unknown payment', async () => {
    tx.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute({ externalId: 'nope', status: PaymentStatus.APPROVED }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks the payment approved and the order paid', async () => {
    await useCase.execute({ externalId: 'mock_1', status: PaymentStatus.APPROVED });

    expect(payment.status).toBe(PaymentStatus.APPROVED);
    expect(order.status).toBe(OrderStatus.PAID);
  });

  it('is idempotent for payments already processed', async () => {
    payment.status = PaymentStatus.APPROVED;

    await useCase.execute({ externalId: 'mock_1', status: PaymentStatus.REJECTED });

    expect(payment.status).toBe(PaymentStatus.APPROVED);
    expect(tx.findOneOrFail).not.toHaveBeenCalled();
    expect(orderService.cancel).not.toHaveBeenCalled();
  });

  it('cancels the order when the payment is rejected', async () => {
    await useCase.execute({ externalId: 'mock_1', status: PaymentStatus.REJECTED });

    expect(payment.status).toBe(PaymentStatus.REJECTED);
    expect(orderService.cancel).toHaveBeenCalledWith(tx, order);
  });

  it('refunds an approval that arrives after the order was cancelled', async () => {
    order.status = OrderStatus.CANCELLED;

    await useCase.execute({ externalId: 'mock_1', status: PaymentStatus.APPROVED });

    expect(payment.status).toBe(PaymentStatus.REFUNDED);
    expect(order.status).toBe(OrderStatus.CANCELLED);
  });
});
