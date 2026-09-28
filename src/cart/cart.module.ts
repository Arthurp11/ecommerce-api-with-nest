import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs/mikro-orm.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AddCartItemUseCase } from './usecases/add-cart-item.usecase';
import { UpdateCartItemUseCase } from './usecases/update-cart-item.usecase';
import { RemoveCartItemUseCase } from './usecases/remove-cart-item.usecase';
import { ClearCartUseCase } from './usecases/clear-cart.usecase';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductModule } from 'src/product/product.module';

@Module({
  imports: [MikroOrmModule.forFeature([Cart, CartItem]), ProductModule],
  controllers: [CartController],
  providers: [CartService, AddCartItemUseCase, UpdateCartItemUseCase, RemoveCartItemUseCase, ClearCartUseCase],
  exports: [CartService],
})
export class CartModule {}
