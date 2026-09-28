import { Collection, Entity, OneToMany, OneToOne } from '@mikro-orm/core';
import { ApiHideProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { CartItem } from './cart-item.entity';

@Entity()
export class Cart extends BaseEntity {
  @ApiHideProperty()
  @OneToOne(() => User, { owner: true, hidden: true, deleteRule: 'cascade' })
  user!: User;

  @OneToMany(() => CartItem, (item) => item.cart, { orphanRemoval: true })
  items = new Collection<CartItem>(this);
}
