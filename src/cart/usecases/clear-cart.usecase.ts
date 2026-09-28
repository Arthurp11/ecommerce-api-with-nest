import { Injectable, Logger } from '@nestjs/common';
import { CartService } from '../cart.service';

@Injectable()
export class ClearCartUseCase {
  private readonly logger = new Logger(ClearCartUseCase.name);

  constructor(private readonly cartService: CartService) {}

  async execute(userId: number) {
    this.logger.log(`Clearing cart of user ${userId}...`);

    const cart = await this.cartService.findByUser(userId);

    if (cart) {
      await this.cartService.clear(cart);
    }

    this.logger.log(`Cart of user ${userId} cleared successfully`);
  }
}
