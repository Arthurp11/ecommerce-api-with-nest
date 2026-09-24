import { ArrayType, Entity, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../common/entities/base.entity';
import { Category } from '../../category/entities/category.entity';

@Entity()
@Index({ properties: ['category', 'isActive'] })
export class Product extends BaseEntity {
  @Property()
  name!: string;

  @Property({ unique: true })
  slug!: string;

  @Property({ type: 'text' })
  description!: string;

  @Property()
  priceInCents!: number;

  @Property()
  stock!: number;

  @Property({ unique: true })
  sku!: string;

  @Property({ type: ArrayType })
  images: string[] = [];

  @Property({ default: true })
  isActive: boolean = true;

  @ManyToOne(() => Category)
  category!: Category;
}
