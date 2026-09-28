import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { CreatePaymentUseCase } from './create-payment.usecase';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Order } from 'src/order/entities/order.entity';
import { OrderStatus } from 'src/order/enums/order-status.enum';

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let provider: jest.Mocked<PaymentProvider>;
  let tx: { findOne: jest.Mock; create: jest.Mock };
  let order: any;
  let pending: any;

  beforeEach(() => {
    order = { id: 5, status: OrderStatus.PENDING_PAYMENT, totalInCents: 2250 };
    pending = null;
    tx = {
      findOne: jest.fn(async (entity) => (entity === Order ? order : pending)),
      create: jest.fn((_entity, data) => ({ id: 1, ...data })),
    };
    provider = {
      name: 'mock',
      createPayment: jest.fn().mockResolvedValue({ externalId: 'mock_1', status: PaymentStatus.PENDING }),
      parseWebhook: jest.fn(),
    };

    const em = { transactional: jest.fn(async (cb) => cb(tx)) } as unknown as EntityManager;

    useCase = new CreatePaymentUseCase(em, provider);
  });

  it('throws NotFoundException when the order does not belong to the user', async () => {
    order = null;

    await expect(useCase.execute(5, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when the order is not awaiting payment', async () => {
    order.status = OrderStatus.PAID;

    await expect(useCase.execute(5, 1)).rejects.toBeInstanceOf(ConflictException);

    expect(provider.createPayment).not.toHaveBeenCalled();
  });

  it('reuses an existing pending payment', async () => {
    pending = { id: 3, externalId: 'mock_old', status: PaymentStatus.PENDING };

    await expect(useCase.execute(5, 1)).resolves.toBe(pending);

    expect(provider.createPayment).not.toHaveBeenCalled();
  });

  it('creates a payment for the order total', async () => {
    const payment: any = await useCase.execute(5, 1);

    expect(provider.createPayment).toHaveBeenCalledWith(order);
    expect(payment).toMatchObject({ provider: 'mock', externalId: 'mock_1', amountInCents: 2250, status: PaymentStatus.PENDING });
  });
});
