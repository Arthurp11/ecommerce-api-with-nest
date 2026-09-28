import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { OrderService } from '../order.service';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Injectable()
export class CancelOrderUseCase {
  private readonly logger = new Logger(CancelOrderUseCase.name);

  constructor(
    private readonly em: EntityManager,
    private readonly orderService: OrderService,
  ) {}

  async execute(id: number, userId: number) {
    this.logger.log(`Cancelling order ${id}...`);

    const cancelled = await this.em.transactional(async (em) => {
      const order = await em.findOne(Order, { id, user: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictException(`Order with ID ${id} can no longer be cancelled`);
      }

      await this.orderService.cancel(em, order);

      return order;
    });

    this.logger.log(`Order ${id} cancelled successfully`);

    return cancelled;
  }
}
