import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs/mikro-orm.module';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { CreateAddressUseCase } from './usecases/create-address.usecase';
import { UpdateAddressUseCase } from './usecases/update-address.usecase';
import { DeleteAddressUseCase } from './usecases/delete-address.usecase';
import { Address } from './entities/address.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Address])],
  controllers: [AddressController],
  providers: [AddressService, CreateAddressUseCase, UpdateAddressUseCase, DeleteAddressUseCase],
  exports: [AddressService],
})
export class AddressModule {}
