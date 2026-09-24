import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs/mikro-orm.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryUseCase } from './usecases/create-category.usecase';
import { UpdateCategoryUseCase } from './usecases/update-category.usecase';
import { DeleteCategoryUseCase } from './usecases/delete-category.usecase';
import { Category } from './entities/category.entity';
import { Product } from 'src/product/entities/product.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Category, Product])],
  controllers: [CategoryController],
  providers: [CategoryService, CreateCategoryUseCase, UpdateCategoryUseCase, DeleteCategoryUseCase],
  exports: [CategoryService],
})
export class CategoryModule {}
