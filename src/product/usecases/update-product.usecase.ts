import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductService } from '../product.service';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CategoryService } from 'src/category/category.service';
import { Category } from 'src/category/entities/category.entity';

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
  ) {}

  async execute(id: number, updateProductDto: UpdateProductDto) {
    const { categoryId, ...data } = updateProductDto;

    this.logger.log(`Updating product with ID ${id}...`);

    const product = await this.productService.findOne(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (data.sku && data.sku !== product.sku) {
      if (await this.productService.findBySku(data.sku)) {
        throw new ConflictException(`Product with SKU ${data.sku} already exists`);
      }
    }

    let category: Category | undefined;

    if (categoryId !== undefined) {
      category = await this.categoryService.findOne(categoryId);

      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
    }

    const productUpdated = await this.productService.update(product, {
      ...data,
      ...(category && { category }),
    });

    this.logger.log(`Product with ID ${id} updated successfully`);

    return productUpdated;
  }
}
