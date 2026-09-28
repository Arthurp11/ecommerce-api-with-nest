import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CartService } from '../cart.service';

@Injectable()
export class RemoveCartItemUseCase {
  private readonly logger = new Logger(RemoveCartItemUseCase.name);

  constructor(private readonly cartService: CartService) {}

  async execute(userId: number, itemId: number) {
    this.logger.log(`Removing cart item ${itemId}...`);

    const cart = await this.cartService.getOrCreate(userId);
    const item = this.cartService.findItem(cart, itemId);

    if (!item) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    await this.cartService.removeItem(cart, item);

    this.logger.log(`Cart item ${itemId} removed successfully`);
  }
}
