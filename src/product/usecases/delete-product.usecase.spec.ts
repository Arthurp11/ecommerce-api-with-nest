import { NotFoundException } from '@nestjs/common';
import { DeleteProductUseCase } from './delete-product.usecase';
import { ProductService } from '../product.service';

describe('DeleteProductUseCase', () => {
  let useCase: DeleteProductUseCase;
  let productService: jest.Mocked<ProductService>;

  beforeEach(() => {
    productService = {
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductService>;

    useCase = new DeleteProductUseCase(productService);
  });

  it('throws NotFoundException when the product does not exist', async () => {
    productService.findOne.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('soft-deletes the product by deactivating it', async () => {
    const product = { id: 1, isActive: true } as any;
    productService.findOne.mockResolvedValue(product);

    await useCase.execute(1);

    expect(productService.update).toHaveBeenCalledWith(product, { isActive: false });
  });
});
