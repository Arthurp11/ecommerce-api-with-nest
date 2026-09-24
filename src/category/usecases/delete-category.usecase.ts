import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CategoryService } from '../category.service';

@Injectable()
export class DeleteCategoryUseCase {
  private readonly logger = new Logger(DeleteCategoryUseCase.name);

  constructor(private readonly categoryService: CategoryService) {}

  async execute(id: number) {
    this.logger.log(`Deleting category with ID ${id}...`);

    const category = await this.categoryService.findOne(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const productCount = await this.categoryService.countProducts(id);

    if (productCount > 0) {
      throw new ConflictException(
        `Category with ID ${id} still has ${productCount} product(s); move them to another category first`,
      );
    }

    await this.categoryService.remove(category);

    this.logger.log(`Category with ID ${id} deleted successfully`);
  }
}
