import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const mikroOrm = app.get(MikroORM);
  await mikroOrm.migrator.up();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
