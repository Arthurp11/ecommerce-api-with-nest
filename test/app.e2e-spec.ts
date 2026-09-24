import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    // The test module doesn't go through main.ts's bootstrap(), so the
    // schema wouldn't otherwise exist on a fresh database (e.g. CI).
    const orm = app.get(MikroORM);
    await orm.migrator.up();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /user rejects an invalid payload with 400', () => {
    return request(app.getHttpServer())
      .post('/user')
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('GET /user/:id requires authentication', () => {
    return request(app.getHttpServer()).get('/user/1').expect(401);
  });

  it('POST /auth/forgot-password rejects an invalid email with 400', () => {
    return request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('POST /auth/forgot-password does not leak whether the email exists', () => {
    return request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'nobody-should-exist@doe.com' })
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toMatch(/if an account/i);
      });
  });

  it('POST /auth/reset-password rejects an invalid token with 401', () => {
    return request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'not-a-real-token', newPassword: 'brandnewpass' })
      .expect(401);
  });
});
