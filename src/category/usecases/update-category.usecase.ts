import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CategoryService } from '../category.service';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class UpdateCategoryUseCase {
  private readonly logger = new Logger(UpdateCategoryUseCase.name);

  constructor(private readonly categoryService: CategoryService) {}

  async execute(id: number, updateCategoryDto: UpdateCategoryDto) {
    this.logger.log(`Updating category with ID ${id}...`);

    const category = await this.categoryService.findOne(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      if (await this.categoryService.findByName(updateCategoryDto.name)) {
        throw new ConflictException(`Category ${updateCategoryDto.name} already exists`);
      }
    }

    const categoryUpdated = await this.categoryService.update(category, updateCategoryDto);

    this.logger.log(`Category with ID ${id} updated successfully`);

    return categoryUpdated;
  }
}
