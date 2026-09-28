import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { CheckoutUseCase } from './checkout.usecase';
import { OrderService } from '../order.service';
import { Cart } from 'src/cart/entities/cart.entity';
import { Address } from 'src/address/entities/address.entity';
import { Order } from '../entities/order.entity';

describe('CheckoutUseCase', () => {
  let useCase: CheckoutUseCase;
  let tx: Record<string, jest.Mock>;
  let cart: any;
  let products: any[];

  const address = {
    id: 7,
    recipientName: 'John Doe',
    zipCode: '01310100',
    street: 'Av. Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  };

  const makeOrder = (data: object) => {
    const items: any[] = [];
    return { id: 99, shippingInCents: 0, ...data, items: { add: (item: any) => items.push(item), getItems: () => items } };
  };

  const makeCart = (items: { productId: number; quantity: number }[]) => {
    const cartItems = items.map((item, index) => ({ id: index + 1, product: { id: item.productId }, quantity: item.quantity }));
    return {
      id: 1,
      items: {
        length: cartItems.length,
        getItems: () => cartItems,
        removeAll: jest.fn(),
      },
    };
  };

  beforeEach(() => {
    products = [
      { id: 10, name: 'Tênis', sku: 'TEN-1', priceInCents: 1000, stock: 5, isActive: true },
      { id: 11, name: 'Meia', sku: 'MEI-1', priceInCents: 250, stock: 1, isActive: true },
    ];
    cart = makeCart([
      { productId: 10, quantity: 2 },
      { productId: 11, quantity: 1 },
    ]);

    tx = {
      findOne: jest.fn(async (entity) => (entity === Cart ? cart : entity === Address ? address : null)),
      create: jest.fn((entity, data) => (entity === Order ? makeOrder(data) : data)),
      getReference: jest.fn((_entity, id) => ({ id })),
    };

    const orderService = {
      lockProducts: jest.fn(async () => new Map(products.map((product) => [product.id, product]))),
    } as unknown as OrderService;

    const em = {
      transactional: jest.fn(async (cb) => cb(tx)),
    } as unknown as EntityManager;

    useCase = new CheckoutUseCase(em, orderService);
  });

  it('throws BadRequestException when the cart is empty', async () => {
    cart = makeCart([]);

    await expect(useCase.execute(1, { addressId: 7 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when the address does not belong to the user', async () => {
    tx.findOne.mockImplementation(async (entity) => (entity === Cart ? cart : null));

    await expect(useCase.execute(1, { addressId: 7 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException without touching stock when an item is out of stock', async () => {
    products[1].stock = 0;

    await expect(useCase.execute(1, { addressId: 7 })).rejects.toBeInstanceOf(ConflictException);

    expect(products[0].stock).toBe(5);
    expect(tx.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when a product was deactivated', async () => {
    products[0].isActive = false;

    await expect(useCase.execute(1, { addressId: 7 })).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates the order, decrements stock and empties the cart', async () => {
    const order: any = await useCase.execute(1, { addressId: 7 });

    expect(products[0].stock).toBe(3);
    expect(products[1].stock).toBe(0);
    expect(order.subtotalInCents).toBe(2250);
    expect(order.totalInCents).toBe(2250);
    expect(order.shippingAddress).toMatchObject({ city: 'São Paulo', zipCode: '01310100' });
    expect(order.items.getItems()).toEqual([
      expect.objectContaining({ productName: 'Tênis', unitPriceInCents: 1000, quantity: 2, lineTotalInCents: 2000 }),
      expect.objectContaining({ productName: 'Meia', unitPriceInCents: 250, quantity: 1, lineTotalInCents: 250 }),
    ]);
    expect(cart.items.removeAll).toHaveBeenCalled();
  });
});
