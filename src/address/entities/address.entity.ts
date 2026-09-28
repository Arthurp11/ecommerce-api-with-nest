import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { ApiHideProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Address extends BaseEntity {
  @ApiHideProperty()
  @ManyToOne(() => User, { hidden: true, deleteRule: 'cascade', index: true })
  user!: User;

  @Property()
  recipientName!: string;

  @Property({ length: 8 })
  zipCode!: string;

  @Property()
  street!: string;

  @Property({ length: 20 })
  number!: string;

  @Property({ nullable: true })
  complement?: string;

  @Property()
  neighborhood!: string;

  @Property()
  city!: string;

  @Property({ length: 2 })
  state!: string;

  @Property({ default: false })
  isDefault: boolean = false;
}
