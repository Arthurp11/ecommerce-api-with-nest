import { ConflictException } from '@nestjs/common';
import { CreateCategoryUseCase } from './create-category.usecase';
import { CategoryService } from '../category.service';

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase;
  let categoryService: jest.Mocked<CategoryService>;

  beforeEach(() => {
    categoryService = {
      findByName: jest.fn(),
      slugExists: jest.fn().mockResolvedValue(false),
      create: jest.fn(),
    } as unknown as jest.Mocked<CategoryService>;

    useCase = new CreateCategoryUseCase(categoryService);
  });

  it('throws ConflictException when the name is already in use', async () => {
    categoryService.findByName.mockResolvedValue({ id: 1, name: 'Shoes' } as any);

    await expect(useCase.execute({ name: 'Shoes' })).rejects.toBeInstanceOf(ConflictException);

    expect(categoryService.create).not.toHaveBeenCalled();
  });

  it('creates the category with a slug generated from the name', async () => {
    categoryService.findByName.mockResolvedValue(null);
    categoryService.create.mockImplementation(async (data) => ({ id: 1, ...data }) as any);

    await useCase.execute({ name: 'Calçados Masculinos' });

    expect(categoryService.create).toHaveBeenCalledWith({
      name: 'Calçados Masculinos',
      slug: 'calcados-masculinos',
    });
  });
});
