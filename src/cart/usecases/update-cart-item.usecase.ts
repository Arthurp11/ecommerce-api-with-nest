import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CartService } from '../cart.service';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';

@Injectable()
export class UpdateCartItemUseCase {
  private readonly logger = new Logger(UpdateCartItemUseCase.name);

  constructor(private readonly cartService: CartService) {}

  async execute(userId: number, itemId: number, { quantity }: UpdateCartItemDto) {
    this.logger.log(`Updating cart item ${itemId}...`);

    const cart = await this.cartService.getOrCreate(userId);
    const item = this.cartService.findItem(cart, itemId);

    if (!item) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    const { product } = item;

    if (quantity > product.stock) {
      throw new BadRequestException(`Only ${product.stock} unit(s) of ${product.name} available`);
    }

    await this.cartService.setItemQuantity(item, quantity);

    this.logger.log(`Cart item ${itemId} updated successfully`);

    return this.cartService.toView(cart);
  }
}
