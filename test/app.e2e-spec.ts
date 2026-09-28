import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { User } from './../src/user/entities/user.entity';
import { UserRole } from './../src/user/enums/user-role.enum';

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

  describe('purchase flow', () => {
    const suffix = Date.now();
    let customerToken: string;
    let adminToken: string;
    let productId: number;
    let productSlug: string;
    let addressId: number;
    let orderId: number;

    const http = () => request(app.getHttpServer());
    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

    const registerAndLogin = async (email: string) => {
      await http().post('/user').send({ name: 'E2E User', email, password: 'secret123' }).expect(201);
      const res = await http().post('/auth/login').send({ email, password: 'secret123' }).expect(201);
      return res.body.accessToken as string;
    };

    beforeAll(async () => {
      const adminEmail = `admin-${suffix}@e2e.com`;
      await registerAndLogin(adminEmail);
      await app.get(MikroORM).em.fork().nativeUpdate(User, { email: adminEmail }, { role: UserRole.ADMIN });
      const adminLogin = await http().post('/auth/login').send({ email: adminEmail, password: 'secret123' }).expect(201);
      adminToken = adminLogin.body.accessToken;

      customerToken = await registerAndLogin(`customer-${suffix}@e2e.com`);

      const category = await http()
        .post('/categories')
        .set(auth(adminToken))
        .send({ name: `E2E Category ${suffix}` })
        .expect(201);

      const product = await http()
        .post('/products')
        .set(auth(adminToken))
        .send({
          name: `E2E Product ${suffix}`,
          description: 'Product used by the e2e suite',
          priceInCents: 1500,
          stock: 3,
          sku: `E2E-${suffix}`,
          categoryId: category.body.id,
        })
        .expect(201);
      productId = product.body.id;
      productSlug = product.body.slug;
    });

    it('returns the current user on GET /user/me', async () => {
      const res = await http().get('/user/me').set(auth(customerToken)).expect(200);

      expect(res.body.email).toBe(`customer-${suffix}@e2e.com`);
      expect(res.body.password).toBeUndefined();
    });

    it('creates the first address as default', async () => {
      const res = await http()
        .post('/addresses')
        .set(auth(customerToken))
        .send({
          recipientName: 'E2E User',
          zipCode: '01310-100',
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'sp',
        })
        .expect(201);

      expect(res.body).toMatchObject({ zipCode: '01310100', state: 'SP', isDefault: true });
      addressId = res.body.id;
    });

    it('rejects adding more than the available stock to the cart', () => {
      return http().post('/cart/items').set(auth(customerToken)).send({ productId, quantity: 4 }).expect(400);
    });

    it('adds items to the cart and sums quantities', async () => {
      await http().post('/cart/items').set(auth(customerToken)).send({ productId, quantity: 1 }).expect(201);
      const res = await http().post('/cart/items').set(auth(customerToken)).send({ productId, quantity: 1 }).expect(201);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.itemCount).toBe(2);
      expect(res.body.subtotalInCents).toBe(3000);
    });

    it('rejects checkout with an address from another user', async () => {
      await http().post('/cart/items').set(auth(adminToken)).send({ productId, quantity: 1 }).expect(201);
      await http().post('/orders').set(auth(adminToken)).send({ addressId }).expect(404);
      await http().delete('/cart').set(auth(adminToken)).expect(204);
    });

    it('checks out the cart, decrementing stock', async () => {
      const res = await http().post('/orders').set(auth(customerToken)).send({ addressId }).expect(201);

      expect(res.body).toMatchObject({ status: 'pending_payment', totalInCents: 3000 });
      expect(res.body.items[0]).toMatchObject({ quantity: 2, unitPriceInCents: 1500 });
      orderId = res.body.id;

      const product = await http().get(`/products/${productSlug}`).expect(200);
      expect(product.body.stock).toBe(1);

      const cart = await http().get('/cart').set(auth(customerToken)).expect(200);
      expect(cart.body.items).toHaveLength(0);
    });

    it('rejects checkout with an empty cart', () => {
      return http().post('/orders').set(auth(customerToken)).send({ addressId }).expect(400);
    });

    it('pays the order through the mock provider', async () => {
      const pay = await http().post(`/orders/${orderId}/pay`).set(auth(customerToken)).expect(201);
      expect(pay.body.status).toBe('pending');

      const again = await http().post(`/orders/${orderId}/pay`).set(auth(customerToken)).expect(201);
      expect(again.body.externalId).toBe(pay.body.externalId);

      await http()
        .post(`/payments/mock/${pay.body.externalId}/approve`)
        .set(auth(customerToken))
        .expect(200);

      const order = await http().get(`/orders/${orderId}`).set(auth(customerToken)).expect(200);
      expect(order.body.status).toBe('paid');
      expect(order.body.payments[0].status).toBe('approved');
    });

    it('rejects the webhook without the shared secret', () => {
      return http().post('/payments/webhook').send({ externalId: 'x', status: 'approved' }).expect(401);
    });

    it('does not let customers cancel a paid order', () => {
      return http().post(`/orders/${orderId}/cancel`).set(auth(customerToken)).expect(409);
    });

    it('lets admins move the order forward and lists it', async () => {
      await http().patch(`/admin/orders/${orderId}/status`).set(auth(customerToken)).send({ status: 'shipped' }).expect(403);
      await http().patch(`/admin/orders/${orderId}/status`).set(auth(adminToken)).send({ status: 'delivered' }).expect(409);

      const res = await http()
        .patch(`/admin/orders/${orderId}/status`)
        .set(auth(adminToken))
        .send({ status: 'shipped' })
        .expect(200);
      expect(res.body.status).toBe('shipped');

      const list = await http().get('/admin/orders?status=shipped').set(auth(adminToken)).expect(200);
      expect(list.body.data.some((o: { id: number }) => o.id === orderId)).toBe(true);
    });

    it('restores stock when a pending order is cancelled', async () => {
      await http().post('/cart/items').set(auth(customerToken)).send({ productId, quantity: 1 }).expect(201);
      const order = await http().post('/orders').set(auth(customerToken)).send({ addressId }).expect(201);

      expect((await http().get(`/products/${productSlug}`)).body.stock).toBe(0);

      const res = await http().post(`/orders/${order.body.id}/cancel`).set(auth(customerToken)).expect(201);
      expect(res.body.status).toBe('cancelled');

      expect((await http().get(`/products/${productSlug}`)).body.stock).toBe(1);
    });

    it('cancels the order and restores stock when the payment is rejected', async () => {
      await http().post('/cart/items').set(auth(customerToken)).send({ productId, quantity: 1 }).expect(201);
      const order = await http().post('/orders').set(auth(customerToken)).send({ addressId }).expect(201);
      const pay = await http().post(`/orders/${order.body.id}/pay`).set(auth(customerToken)).expect(201);

      await http().post(`/payments/mock/${pay.body.externalId}/reject`).set(auth(customerToken)).expect(200);

      const res = await http().get(`/orders/${order.body.id}`).set(auth(customerToken)).expect(200);
      expect(res.body.status).toBe('cancelled');
      expect((await http().get(`/products/${productSlug}`)).body.stock).toBe(1);
    });

    it('lists only the customer orders', async () => {
      const res = await http().get('/orders').set(auth(customerToken)).expect(200);

      expect(res.body.meta.total).toBe(3);
    });

    it('sells the last unit only once under concurrent checkouts', async () => {
      const otherToken = await registerAndLogin(`customer2-${suffix}@e2e.com`);
      const otherAddress = await http()
        .post('/addresses')
        .set(auth(otherToken))
        .send({
          recipientName: 'Other User',
          zipCode: '20040002',
          street: 'Rua da Assembleia',
          number: '10',
          neighborhood: 'Centro',
          city: 'Rio de Janeiro',
          state: 'RJ',
        })
        .expect(201);

      await http().post('/cart/items').set(auth(customerToken)).send({ productId, quantity: 1 }).expect(201);
      await http().post('/cart/items').set(auth(otherToken)).send({ productId, quantity: 1 }).expect(201);

      const results = await Promise.all([
        http().post('/orders').set(auth(customerToken)).send({ addressId }),
        http().post('/orders').set(auth(otherToken)).send({ addressId: otherAddress.body.id }),
      ]);

      expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
      expect((await http().get(`/products/${productSlug}`)).body.stock).toBe(0);
    });
  });
});
