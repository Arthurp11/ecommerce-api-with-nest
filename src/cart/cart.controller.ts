import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemUseCase } from './usecases/add-cart-item.usecase';
import { UpdateCartItemUseCase } from './usecases/update-cart-item.usecase';
import { RemoveCartItemUseCase } from './usecases/remove-cart-item.usecase';
import { ClearCartUseCase } from './usecases/clear-cart.usecase';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly addCartItemUseCase: AddCartItemUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  @Get()
  async findMine(@CurrentUser() user: AuthenticatedUserDto) {
    const cart = await this.cartService.getOrCreate(user.userId);
    return this.cartService.toView(cart);
  }

  @Post('items')
  addItem(@Body() addCartItemDto: AddCartItemDto, @CurrentUser() user: AuthenticatedUserDto) {
    return this.addCartItemUseCase.execute(user.userId, addCartItemDto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.updateCartItemUseCase.execute(user.userId, itemId, updateCartItemDto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(@Param('itemId', ParseIntPipe) itemId: number, @CurrentUser() user: AuthenticatedUserDto) {
    return this.removeCartItemUseCase.execute(user.userId, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clear(@CurrentUser() user: AuthenticatedUserDto) {
    return this.clearCartUseCase.execute(user.userId);
  }
}
