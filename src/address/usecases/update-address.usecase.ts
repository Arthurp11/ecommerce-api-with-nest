import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AddressService } from '../address.service';
import { UpdateAddressDto } from '../dto/update-address.dto';

@Injectable()
export class UpdateAddressUseCase {
  private readonly logger = new Logger(UpdateAddressUseCase.name);

  constructor(private readonly addressService: AddressService) {}

  async execute(id: number, userId: number, updateAddressDto: UpdateAddressDto) {
    this.logger.log(`Updating address ${id}...`);

    const address = await this.addressService.findOneForUser(id, userId);

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    const { isDefault, ...changes } = updateAddressDto;
    const becomesDefault = isDefault === true && !address.isDefault;

    if (becomesDefault) {
      await this.addressService.clearDefault(userId);
    }

    const updated = await this.addressService.update(address, becomesDefault ? { ...changes, isDefault: true } : changes);

    this.logger.log(`Address ${id} updated successfully`);

    return updated;
  }
}
