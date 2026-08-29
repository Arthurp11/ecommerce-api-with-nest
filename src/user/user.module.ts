import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CreateUserUseCase } from './usecases/create-user.usecase';
import { UpdateUserUseCase } from './usecases/update-user.usecase';
import { User } from './entities/user.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs/mikro-orm.module';

@Module({
  imports: [MikroOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService, CreateUserUseCase, UpdateUserUseCase],
  exports: [UserService],
})
export class UserModule {}
