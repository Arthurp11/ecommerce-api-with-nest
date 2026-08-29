import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { MikroOrmModule } from '@mikro-orm/nestjs/mikro-orm.module';
import { config } from 'process';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: 
  [
    UserModule, 
    AuthModule,
    MikroOrmModule.forRoot(), 
    ConfigModule.forRoot()
  ],
})
export class AppModule {}
  