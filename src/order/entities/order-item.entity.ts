import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { ApiHideProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Product } from '../../product/entities/product.entity';
import { Order } from './order.entity';

@Entity()
export class OrderItem extends BaseEntity {
  @ApiHideProperty()
  @ManyToOne(() => Order, { hidden: true, deleteRule: 'cascade' })
  order!: Order;

  @ManyToOne(() => Product, { nullable: true, deleteRule: 'set null' })
  product?: Product | null;

  @Property()
  productName!: string;

  @Property()
  sku!: string;

  @Property()
  unitPriceInCents!: number;

  @Property()
  quantity!: number;

  @Property()
  lineTotalInCents!: number;
}
