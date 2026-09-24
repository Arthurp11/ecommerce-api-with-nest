import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs/mikro-orm.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CreateProductUseCase } from './usecases/create-product.usecase';
import { UpdateProductUseCase } from './usecases/update-product.usecase';
import { DeleteProductUseCase } from './usecases/delete-product.usecase';
import { Product } from './entities/product.entity';
import { CategoryModule } from 'src/category/category.module';

@Module({
  imports: [MikroOrmModule.forFeature([Product]), CategoryModule],
  controllers: [ProductController],
  providers: [ProductService, CreateProductUseCase, UpdateProductUseCase, DeleteProductUseCase],
  exports: [ProductService],
})
export class ProductModule {}
