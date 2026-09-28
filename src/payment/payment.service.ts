import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: EntityRepository<Payment>,
  ) {}

  findByExternalIdForUser(externalId: string, userId: number) {
    return this.paymentRepository.findOne({ externalId, order: { user: userId } });
  }
}
