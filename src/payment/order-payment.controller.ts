import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreatePaymentUseCase } from './usecases/create-payment.usecase';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderPaymentController {
  constructor(private readonly createPaymentUseCase: CreatePaymentUseCase) {}

  @Post(':id/pay')
  pay(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUserDto) {
    return this.createPaymentUseCase.execute(id, user.userId);
  }
}
