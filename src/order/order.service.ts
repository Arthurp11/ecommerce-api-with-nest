import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository, FilterQuery, LockMode, QueryOrderMap } from '@mikro-orm/postgresql';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { OrderQueryDto } from './dto/order-query.dto';
import { paginate } from 'src/common/dto/pagination-query.dto';
import { Product } from 'src/product/entities/product.entity';
import { PaymentStatus } from 'src/payment/enums/payment-status.enum';

const NEWEST_FIRST: QueryOrderMap<Order> = { createdAt: 'desc', id: 'desc' };

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: EntityRepository<Order>,
  ) {}

  async findAllByUser(userId: number, query: OrderQueryDto) {
    const [orders, total] = await this.orderRepository.findAndCount(this.buildFilter(query, userId), {
      populate: ['items'],
      orderBy: NEWEST_FIRST,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    return paginate(orders, total, query);
  }

  async findAll(query: OrderQueryDto) {
    const [orders, total] = await this.orderRepository.findAndCount(this.buildFilter(query), {
      populate: ['items', 'user'],
      orderBy: NEWEST_FIRST,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    return paginate(orders, total, query);
  }

  findOneForUser(id: number, userId: number) {
    return this.orderRepository.findOne({ id, user: userId }, { populate: ['items', 'payments'] });
  }

  findOne(id: number) {
    return this.orderRepository.findOne({ id }, { populate: ['items', 'payments', 'user'] });
  }

  async lockProducts(em: EntityManager, ids: number[]) {
    const products = await em.find(
      Product,
      { id: { $in: ids } },
      { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: 'asc' } },
    );

    return new Map(products.map((product) => [product.id, product]));
  }

  async cancel(em: EntityManager, order: Order) {
    await em.populate(order, ['items', 'payments']);
    await this.restoreStock(em, order);

    for (const payment of order.payments) {
      if (payment.status === PaymentStatus.APPROVED) {
        payment.status = PaymentStatus.REFUNDED;
      }

      if (payment.status === PaymentStatus.PENDING) {
        payment.status = PaymentStatus.REJECTED;
      }
    }

    order.status = OrderStatus.CANCELLED;
  }

  private async restoreStock(em: EntityManager, order: Order) {
    const items = order.items.getItems().filter((item) => item.product);

    if (items.length === 0) {
      return;
    }

    const products = await this.lockProducts(em, items.map((item) => item.product!.id));

    for (const item of items) {
      products.get(item.product!.id)!.stock += item.quantity;
    }
  }

  private buildFilter(query: OrderQueryDto, userId?: number) {
    const where: FilterQuery<Order> & { user?: number; status?: OrderStatus } = {};

    if (userId) {
      where.user = userId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return where;
  }
}
