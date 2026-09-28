import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CheckoutUseCase } from './usecases/checkout.usecase';
import { CancelOrderUseCase } from './usecases/cancel-order.usecase';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { UserRole } from 'src/user/enums/user-role.enum';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly checkoutUseCase: CheckoutUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
  ) {}

  @Post()
  checkout(@Body() checkoutDto: CheckoutDto, @CurrentUser() user: AuthenticatedUserDto) {
    return this.checkoutUseCase.execute(user.userId, checkoutDto);
  }

  @Get()
  findMine(@Query() query: OrderQueryDto, @CurrentUser() user: AuthenticatedUserDto) {
    return this.orderService.findAllByUser(user.userId, query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUserDto) {
    const order =
      user.role === UserRole.ADMIN
        ? await this.orderService.findOne(id)
        : await this.orderService.findOneForUser(id, user.userId);

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUserDto) {
    return this.cancelOrderUseCase.execute(id, user.userId);
  }
}
