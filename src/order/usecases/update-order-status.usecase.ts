import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { OrderService } from '../order.service';
import { Order } from '../entities/order.entity';
import { ADMIN_STATUS_TRANSITIONS, OrderStatus } from '../enums/order-status.enum';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';

@Injectable()
export class UpdateOrderStatusUseCase {
  private readonly logger = new Logger(UpdateOrderStatusUseCase.name);

  constructor(
    private readonly em: EntityManager,
    private readonly orderService: OrderService,
  ) {}

  async execute(id: number, { status }: UpdateOrderStatusDto) {
    this.logger.log(`Updating order ${id} to ${status}...`);

    const updated = await this.em.transactional(async (em) => {
      const order = await em.findOne(Order, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (!ADMIN_STATUS_TRANSITIONS[order.status].includes(status)) {
        throw new ConflictException(`Cannot change order ${id} from ${order.status} to ${status}`);
      }

      if (status === OrderStatus.CANCELLED) {
        await this.orderService.cancel(em, order);
      } else {
        order.status = status;
      }

      return order;
    });

    this.logger.log(`Order ${id} updated to ${status}`);

    return updated;
  }
}
