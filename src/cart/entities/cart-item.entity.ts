import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { ApiHideProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Product } from '../../product/entities/product.entity';
import { Cart } from './cart.entity';

@Entity()
@Unique({ properties: ['cart', 'product'] })
export class CartItem extends BaseEntity {
  @ApiHideProperty()
  @ManyToOne(() => Cart, { hidden: true, deleteRule: 'cascade' })
  cart!: Cart;

  @ManyToOne(() => Product, { deleteRule: 'cascade' })
  product!: Product;

  @Property()
  quantity!: number;
}
