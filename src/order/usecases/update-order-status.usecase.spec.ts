import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UpdateOrderStatusUseCase } from './update-order-status.usecase';
import { OrderService } from '../order.service';
import { OrderStatus } from '../enums/order-status.enum';

describe('UpdateOrderStatusUseCase', () => {
  let useCase: UpdateOrderStatusUseCase;
  let orderService: jest.Mocked<OrderService>;
  let tx: { findOne: jest.Mock };

  beforeEach(() => {
    tx = { findOne: jest.fn() };
    orderService = { cancel: jest.fn() } as unknown as jest.Mocked<OrderService>;

    const em = { transactional: jest.fn(async (cb) => cb(tx)) } as unknown as EntityManager;

    useCase = new UpdateOrderStatusUseCase(em, orderService);
  });

  it('throws NotFoundException when the order does not exist', async () => {
    tx.findOne.mockResolvedValue(null);

    await expect(useCase.execute(1, { status: OrderStatus.SHIPPED })).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    [OrderStatus.PENDING_PAYMENT, OrderStatus.SHIPPED],
    [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID],
    [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERED, OrderStatus.SHIPPED],
    [OrderStatus.CANCELLED, OrderStatus.PAID],
  ])('rejects %s -> %s', async (from, to) => {
    tx.findOne.mockResolvedValue({ id: 1, status: from });

    await expect(useCase.execute(1, { status: to })).rejects.toBeInstanceOf(ConflictException);
  });

  it('moves a paid order to shipped', async () => {
    const order = { id: 1, status: OrderStatus.PAID };
    tx.findOne.mockResolvedValue(order);

    await useCase.execute(1, { status: OrderStatus.SHIPPED });

    expect(order.status).toBe(OrderStatus.SHIPPED);
    expect(orderService.cancel).not.toHaveBeenCalled();
  });

  it('delegates cancellation so stock is restored', async () => {
    const order = { id: 1, status: OrderStatus.PAID };
    tx.findOne.mockResolvedValue(order);

    await useCase.execute(1, { status: OrderStatus.CANCELLED });

    expect(orderService.cancel).toHaveBeenCalledWith(tx, order);
  });
});
