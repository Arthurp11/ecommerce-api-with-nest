import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { CategoryService } from '../category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { generateUniqueSlug } from 'src/common/utils/slugify';

@Injectable()
export class CreateCategoryUseCase {
  private readonly logger = new Logger(CreateCategoryUseCase.name);

  constructor(private readonly categoryService: CategoryService) {}

  async execute(createCategoryDto: CreateCategoryDto) {
    this.logger.log(`Creating category ${createCategoryDto.name}...`);

    if (await this.categoryService.findByName(createCategoryDto.name)) {
      throw new ConflictException(`Category ${createCategoryDto.name} already exists`);
    }

    const slug = await generateUniqueSlug(createCategoryDto.name, (s) =>
      this.categoryService.slugExists(s),
    );

    try {
      const category = await this.categoryService.create({ ...createCategoryDto, slug });

      this.logger.log(`Category ${category.name} created with ID ${category.id}`);

      return category;
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictException(`Category ${createCategoryDto.name} already exists`);
      }
      throw error;
    }
  }
}
