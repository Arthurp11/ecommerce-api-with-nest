import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs/mikro-orm.module';
import { PaymentController } from './payment.controller';
import { OrderPaymentController } from './order-payment.controller';
import { PaymentService } from './payment.service';
import { CreatePaymentUseCase } from './usecases/create-payment.usecase';
import { HandlePaymentWebhookUseCase } from './usecases/handle-payment-webhook.usecase';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { Payment } from './entities/payment.entity';
import { OrderModule } from 'src/order/order.module';

@Module({
  imports: [MikroOrmModule.forFeature([Payment]), OrderModule],
  controllers: [OrderPaymentController, PaymentController],
  providers: [
    PaymentService,
    CreatePaymentUseCase,
    HandlePaymentWebhookUseCase,
    { provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider },
  ],
})
export class PaymentModule {}
