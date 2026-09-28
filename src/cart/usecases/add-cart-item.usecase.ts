import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CartService } from '../cart.service';
import { AddCartItemDto } from '../dto/add-cart-item.dto';
import { ProductService } from 'src/product/product.service';

@Injectable()
export class AddCartItemUseCase {
  private readonly logger = new Logger(AddCartItemUseCase.name);

  constructor(
    private readonly cartService: CartService,
    private readonly productService: ProductService,
  ) {}

  async execute(userId: number, { productId, quantity }: AddCartItemDto) {
    this.logger.log(`Adding product ${productId} to cart of user ${userId}...`);

    const product = await this.productService.findOne(productId);

    if (!product || !product.isActive) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const cart = await this.cartService.getOrCreate(userId);
    const existingItem = this.cartService.findItemByProduct(cart, productId);
    const totalQuantity = (existingItem?.quantity ?? 0) + quantity;

    if (totalQuantity > product.stock) {
      throw new BadRequestException(`Only ${product.stock} unit(s) of ${product.name} available`);
    }

    if (existingItem) {
      await this.cartService.setItemQuantity(existingItem, totalQuantity);
    } else {
      await this.cartService.addItem(cart, product, quantity);
    }

    this.logger.log(`Product ${productId} added to cart ${cart.id}`);

    return this.cartService.toView(cart);
  }
}
