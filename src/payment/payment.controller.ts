import { Body, Controller, Headers, HttpCode, HttpStatus, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentService } from './payment.service';
import { HandlePaymentWebhookUseCase } from './usecases/handle-payment-webhook.usecase';
import { PaymentStatus } from './enums/payment-status.enum';
import { PAYMENT_PROVIDER, PaymentEvent, PaymentProvider, WebhookHeaders } from './providers/payment-provider.interface';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { IsPublic } from 'src/auth/decorators/is-public.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly handlePaymentWebhookUseCase: HandlePaymentWebhookUseCase,
    private readonly configService: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  @IsPublic()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() body: unknown, @Headers() headers: WebhookHeaders) {
    const event = this.paymentProvider.parseWebhook(body, headers);
    const payment = await this.handlePaymentWebhookUseCase.execute(event);

    return { received: true, status: payment.status };
  }

  @Post('mock/:externalId/approve')
  @HttpCode(HttpStatus.OK)
  approveMock(@Param('externalId') externalId: string, @CurrentUser() user: AuthenticatedUserDto) {
    return this.simulate({ externalId, status: PaymentStatus.APPROVED }, user.userId);
  }

  @Post('mock/:externalId/reject')
  @HttpCode(HttpStatus.OK)
  rejectMock(@Param('externalId') externalId: string, @CurrentUser() user: AuthenticatedUserDto) {
    return this.simulate({ externalId, status: PaymentStatus.REJECTED }, user.userId);
  }

  private async simulate(event: PaymentEvent, userId: number) {
    if (this.configService.get('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }

    const payment = await this.paymentService.findByExternalIdForUser(event.externalId, userId);

    if (!payment) {
      throw new NotFoundException(`Payment ${event.externalId} not found`);
    }

    return this.handlePaymentWebhookUseCase.execute(event);
  }
}
