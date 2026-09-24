import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateProductUseCase } from './create-product.usecase';
import { ProductService } from '../product.service';
import { CategoryService } from 'src/category/category.service';
import { CreateProductDto } from '../dto/create-product.dto';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let productService: jest.Mocked<ProductService>;
  let categoryService: jest.Mocked<CategoryService>;

  const dto: CreateProductDto = {
    name: 'Tênis Runner',
    description: 'A running shoe',
    priceInCents: 29990,
    stock: 10,
    sku: 'RUN-001',
    categoryId: 1,
  };

  beforeEach(() => {
    productService = {
      findBySku: jest.fn(),
      slugExists: jest.fn().mockResolvedValue(false),
      create: jest.fn(),
    } as unknown as jest.Mocked<ProductService>;

    categoryService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<CategoryService>;

    useCase = new CreateProductUseCase(productService, categoryService);
  });

  it('throws NotFoundException when the category does not exist', async () => {
    categoryService.findOne.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(NotFoundException);

    expect(productService.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the SKU is already in use', async () => {
    categoryService.findOne.mockResolvedValue({ id: 1 } as any);
    productService.findBySku.mockResolvedValue({ id: 5, sku: 'RUN-001' } as any);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(ConflictException);

    expect(productService.create).not.toHaveBeenCalled();
  });

  it('creates the product with its category and a generated slug', async () => {
    const category = { id: 1 } as any;
    categoryService.findOne.mockResolvedValue(category);
    productService.findBySku.mockResolvedValue(null);
    productService.slugExists.mockImplementation(async (slug) => slug === 'tenis-runner');
    productService.create.mockImplementation(async (data) => ({ id: 1, ...data }) as any);

    await useCase.execute(dto);

    const { categoryId, ...rest } = dto;
    expect(productService.create).toHaveBeenCalledWith({
      ...rest,
      slug: 'tenis-runner-2',
      category,
    });
  });
});
