import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { ApiHideProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from '../../order/entities/order.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity()
export class Payment extends BaseEntity {
  @ApiHideProperty()
  @ManyToOne(() => Order, { hidden: true, index: true })
  order!: Order;

  @Property()
  provider!: string;

  @Property({ unique: true })
  externalId!: string;

  @Property()
  amountInCents!: number;

  @Enum({ items: () => PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus = PaymentStatus.PENDING;

  @Property({ nullable: true })
  checkoutUrl?: string | null;
}
