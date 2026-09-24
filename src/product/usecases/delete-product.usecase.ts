import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductService } from '../product.service';

@Injectable()
export class DeleteProductUseCase {
  private readonly logger = new Logger(DeleteProductUseCase.name);

  constructor(private readonly productService: ProductService) {}

  async execute(id: number) {
    this.logger.log(`Deactivating product with ID ${id}...`);

    const product = await this.productService.findOne(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productService.update(product, { isActive: false });

    this.logger.log(`Product with ID ${id} deactivated successfully`);
  }
}
