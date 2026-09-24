import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { ProductService } from '../product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { CategoryService } from 'src/category/category.service';
import { generateUniqueSlug } from 'src/common/utils/slugify';

@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
  ) {}

  async execute(createProductDto: CreateProductDto) {
    const { categoryId, ...data } = createProductDto;

    this.logger.log(`Creating product ${data.sku}...`);

    const category = await this.categoryService.findOne(categoryId);

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    if (await this.productService.findBySku(data.sku)) {
      throw new ConflictException(`Product with SKU ${data.sku} already exists`);
    }

    const slug = await generateUniqueSlug(data.name, (s) => this.productService.slugExists(s));

    try {
      const product = await this.productService.create({ ...data, slug, category });

      this.logger.log(`Product ${product.sku} created with ID ${product.id}`);

      return product;
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictException(`Product with SKU ${data.sku} already exists`);
      }
      throw error;
    }
  }
}
