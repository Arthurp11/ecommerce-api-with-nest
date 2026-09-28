import { Collection, Entity, Enum, Index, ManyToOne, OneToMany, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payment/entities/payment.entity';

export interface ShippingAddress {
  recipientName: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

@Entity({ tableName: 'orders' })
@Index({ properties: ['user', 'createdAt'] })
export class Order extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @Enum({ items: () => OrderStatus, default: OrderStatus.PENDING_PAYMENT, index: true })
  status: OrderStatus = OrderStatus.PENDING_PAYMENT;

  @Property()
  subtotalInCents!: number;

  @Property({ default: 0 })
  shippingInCents: number = 0;

  @Property()
  totalInCents!: number;

  @Property({ type: 'json' })
  shippingAddress!: ShippingAddress;

  @OneToMany(() => OrderItem, (item) => item.order)
  items = new Collection<OrderItem>(this);

  @OneToMany(() => Payment, (payment) => payment.order)
  payments = new Collection<Payment>(this);
}
