import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Address } from './entities/address.entity';
import { User } from 'src/user/entities/user.entity';

type AddressData = Omit<Partial<Address>, 'user'>;

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: EntityRepository<Address>,
  ) {}

  findAllByUser(userId: number) {
    return this.addressRepository.find(
      { user: userId },
      { orderBy: { isDefault: 'desc', createdAt: 'desc', id: 'desc' } },
    );
  }

  findOneForUser(id: number, userId: number) {
    return this.addressRepository.findOne({ id, user: userId });
  }

  countByUser(userId: number) {
    return this.addressRepository.count({ user: userId });
  }

  findLatestForUser(userId: number) {
    return this.addressRepository.findOne(
      { user: userId },
      { orderBy: { createdAt: 'desc', id: 'desc' } },
    );
  }

  clearDefault(userId: number) {
    return this.addressRepository.nativeUpdate({ user: userId, isDefault: true }, { isDefault: false });
  }

  async create(userId: number, data: AddressData) {
    const em = this.addressRepository.getEntityManager();
    const address = this.addressRepository.create({ ...data, user: em.getReference(User, userId) } as Address);
    await em.persist(address).flush();
    return address;
  }

  async update(address: Address, data: AddressData) {
    this.addressRepository.assign(address, data);
    await this.addressRepository.getEntityManager().flush();
    return address;
  }

  async remove(address: Address) {
    await this.addressRepository.getEntityManager().remove(address).flush();
  }
}
