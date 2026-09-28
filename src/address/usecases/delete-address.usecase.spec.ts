import { NotFoundException } from '@nestjs/common';
import { DeleteAddressUseCase } from './delete-address.usecase';
import { AddressService } from '../address.service';

describe('DeleteAddressUseCase', () => {
  let useCase: DeleteAddressUseCase;
  let addressService: jest.Mocked<AddressService>;

  beforeEach(() => {
    addressService = {
      findOneForUser: jest.fn(),
      findLatestForUser: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<AddressService>;

    useCase = new DeleteAddressUseCase(addressService);
  });

  it('throws NotFoundException when the address does not belong to the user', async () => {
    addressService.findOneForUser.mockResolvedValue(null);

    await expect(useCase.execute(1, 2)).rejects.toBeInstanceOf(NotFoundException);

    expect(addressService.remove).not.toHaveBeenCalled();
  });

  it('promotes the latest remaining address when the default is deleted', async () => {
    const address = { id: 1, isDefault: true } as any;
    const next = { id: 2, isDefault: false } as any;
    addressService.findOneForUser.mockResolvedValue(address);
    addressService.findLatestForUser.mockResolvedValue(next);

    await useCase.execute(1, 1);

    expect(addressService.remove).toHaveBeenCalledWith(address);
    expect(addressService.update).toHaveBeenCalledWith(next, { isDefault: true });
  });

  it('does not promote anything when a non-default address is deleted', async () => {
    addressService.findOneForUser.mockResolvedValue({ id: 1, isDefault: false } as any);

    await useCase.execute(1, 1);

    expect(addressService.findLatestForUser).not.toHaveBeenCalled();
    expect(addressService.update).not.toHaveBeenCalled();
  });
});
