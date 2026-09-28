import { CreateAddressUseCase } from './create-address.usecase';
import { AddressService } from '../address.service';
import { CreateAddressDto } from '../dto/create-address.dto';

describe('CreateAddressUseCase', () => {
  let useCase: CreateAddressUseCase;
  let addressService: jest.Mocked<AddressService>;

  const dto: CreateAddressDto = {
    recipientName: 'John Doe',
    zipCode: '01310100',
    street: 'Av. Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  };

  beforeEach(() => {
    addressService = {
      countByUser: jest.fn(),
      clearDefault: jest.fn(),
      create: jest.fn().mockImplementation(async (_userId, data) => ({ id: 1, ...data })),
    } as unknown as jest.Mocked<AddressService>;

    useCase = new CreateAddressUseCase(addressService);
  });

  it('marks the first address as default', async () => {
    addressService.countByUser.mockResolvedValue(0);

    await useCase.execute(1, dto);

    expect(addressService.clearDefault).not.toHaveBeenCalled();
    expect(addressService.create).toHaveBeenCalledWith(1, { ...dto, isDefault: true });
  });

  it('does not touch the current default when isDefault is not requested', async () => {
    addressService.countByUser.mockResolvedValue(2);

    await useCase.execute(1, dto);

    expect(addressService.clearDefault).not.toHaveBeenCalled();
    expect(addressService.create).toHaveBeenCalledWith(1, { ...dto, isDefault: false });
  });

  it('clears the previous default when a new default is requested', async () => {
    addressService.countByUser.mockResolvedValue(2);

    await useCase.execute(1, { ...dto, isDefault: true });

    expect(addressService.clearDefault).toHaveBeenCalledWith(1);
    expect(addressService.create).toHaveBeenCalledWith(1, { ...dto, isDefault: true });
  });
});
