import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs/mikro-orm.module';
import { OrderController } from './order.controller';
import { AdminOrderController } from './admin-order.controller';
import { OrderService } from './order.service';
import { CheckoutUseCase } from './usecases/checkout.usecase';
import { CancelOrderUseCase } from './usecases/cancel-order.usecase';
import { UpdateOrderStatusUseCase } from './usecases/update-order-status.usecase';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrderController, AdminOrderController],
  providers: [OrderService, CheckoutUseCase, CancelOrderUseCase, UpdateOrderStatusUseCase],
  exports: [OrderService],
})
export class OrderModule {}
