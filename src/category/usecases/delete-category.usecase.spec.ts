import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteCategoryUseCase } from './delete-category.usecase';
import { CategoryService } from '../category.service';

describe('DeleteCategoryUseCase', () => {
  let useCase: DeleteCategoryUseCase;
  let categoryService: jest.Mocked<CategoryService>;

  beforeEach(() => {
    categoryService = {
      findOne: jest.fn(),
      countProducts: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<CategoryService>;

    useCase = new DeleteCategoryUseCase(categoryService);
  });

  it('throws NotFoundException when the category does not exist', async () => {
    categoryService.findOne.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when the category still has products', async () => {
    categoryService.findOne.mockResolvedValue({ id: 1 } as any);
    categoryService.countProducts.mockResolvedValue(3);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(ConflictException);

    expect(categoryService.remove).not.toHaveBeenCalled();
  });

  it('removes an empty category', async () => {
    const category = { id: 1 } as any;
    categoryService.findOne.mockResolvedValue(category);
    categoryService.countProducts.mockResolvedValue(0);

    await useCase.execute(1);

    expect(categoryService.remove).toHaveBeenCalledWith(category);
  });
});
