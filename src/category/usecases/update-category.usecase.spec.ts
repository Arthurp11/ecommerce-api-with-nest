import { ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateCategoryUseCase } from './update-category.usecase';
import { CategoryService } from '../category.service';

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase;
  let categoryService: jest.Mocked<CategoryService>;

  beforeEach(() => {
    categoryService = {
      findOne: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<CategoryService>;

    useCase = new UpdateCategoryUseCase(categoryService);
  });

  it('throws NotFoundException when the category does not exist', async () => {
    categoryService.findOne.mockResolvedValue(null);

    await expect(useCase.execute(1, { name: 'Shoes' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when renaming to a name in use', async () => {
    categoryService.findOne.mockResolvedValue({ id: 1, name: 'Shoes' } as any);
    categoryService.findByName.mockResolvedValue({ id: 2, name: 'Boots' } as any);

    await expect(useCase.execute(1, { name: 'Boots' })).rejects.toBeInstanceOf(ConflictException);

    expect(categoryService.update).not.toHaveBeenCalled();
  });

  it('updates the category', async () => {
    const category = { id: 1, name: 'Shoes' } as any;
    categoryService.findOne.mockResolvedValue(category);
    categoryService.findByName.mockResolvedValue(null);

    await useCase.execute(1, { name: 'Sneakers' });

    expect(categoryService.update).toHaveBeenCalledWith(category, { name: 'Sneakers' });
  });
});
