import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './user/user.module';
import { MikroOrmModule } from '@mikro-orm/nestjs/mikro-orm.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import mikroOrmConfig from '../mikro-orm.config';

@Module({
  imports: [
    UserModule,
    AuthModule,
    MikroOrmModule.forRoot(mikroOrmConfig),
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
