import { Injectable, Logger } from '@nestjs/common';
import { AddressService } from '../address.service';
import { CreateAddressDto } from '../dto/create-address.dto';

@Injectable()
export class CreateAddressUseCase {
  private readonly logger = new Logger(CreateAddressUseCase.name);

  constructor(private readonly addressService: AddressService) {}

  async execute(userId: number, createAddressDto: CreateAddressDto) {
    this.logger.log(`Creating address for user ${userId}...`);

    const isFirstAddress = (await this.addressService.countByUser(userId)) === 0;
    const isDefault = isFirstAddress || createAddressDto.isDefault === true;

    if (isDefault && !isFirstAddress) {
      await this.addressService.clearDefault(userId);
    }

    const address = await this.addressService.create(userId, { ...createAddressDto, isDefault });

    this.logger.log(`Address ${address.id} created for user ${userId}`);

    return address;
  }
}
