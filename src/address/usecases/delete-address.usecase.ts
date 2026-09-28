import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AddressService } from '../address.service';

@Injectable()
export class DeleteAddressUseCase {
  private readonly logger = new Logger(DeleteAddressUseCase.name);

  constructor(private readonly addressService: AddressService) {}

  async execute(id: number, userId: number) {
    this.logger.log(`Deleting address ${id}...`);

    const address = await this.addressService.findOneForUser(id, userId);

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    const wasDefault = address.isDefault;

    await this.addressService.remove(address);

    if (wasDefault) {
      const next = await this.addressService.findLatestForUser(userId);

      if (next) {
        await this.addressService.update(next, { isDefault: true });
      }
    }

    this.logger.log(`Address ${id} deleted successfully`);
  }
}
