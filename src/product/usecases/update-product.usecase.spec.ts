import { ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateProductUseCase } from './update-product.usecase';
import { ProductService } from '../product.service';
import { CategoryService } from 'src/category/category.service';

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let productService: jest.Mocked<ProductService>;
  let categoryService: jest.Mocked<CategoryService>;

  beforeEach(() => {
    productService = {
      findOne: jest.fn(),
      findBySku: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductService>;

    categoryService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<CategoryService>;

    useCase = new UpdateProductUseCase(productService, categoryService);
  });

  it('throws NotFoundException when the product does not exist', async () => {
    productService.findOne.mockResolvedValue(null);

    await expect(useCase.execute(1, { stock: 5 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when changing to a SKU in use', async () => {
    productService.findOne.mockResolvedValue({ id: 1, sku: 'A' } as any);
    productService.findBySku.mockResolvedValue({ id: 2, sku: 'B' } as any);

    await expect(useCase.execute(1, { sku: 'B' })).rejects.toBeInstanceOf(ConflictException);

    expect(productService.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when moving to a category that does not exist', async () => {
    productService.findOne.mockResolvedValue({ id: 1, sku: 'A' } as any);
    categoryService.findOne.mockResolvedValue(null);

    await expect(useCase.execute(1, { categoryId: 99 })).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(productService.update).not.toHaveBeenCalled();
  });

  it('updates the product and swaps categoryId for the category entity', async () => {
    const product = { id: 1, sku: 'A' } as any;
    const category = { id: 2 } as any;
    productService.findOne.mockResolvedValue(product);
    categoryService.findOne.mockResolvedValue(category);

    await useCase.execute(1, { stock: 3, categoryId: 2 });

    expect(productService.update).toHaveBeenCalledWith(product, { stock: 3, category });
  });
});
