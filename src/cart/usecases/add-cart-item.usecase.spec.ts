import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AddCartItemUseCase } from './add-cart-item.usecase';
import { CartService } from '../cart.service';
import { ProductService } from 'src/product/product.service';

describe('AddCartItemUseCase', () => {
  let useCase: AddCartItemUseCase;
  let cartService: jest.Mocked<CartService>;
  let productService: jest.Mocked<ProductService>;

  const product = { id: 10, name: 'Tênis', stock: 5, isActive: true, priceInCents: 1000 } as any;
  const cart = { id: 1 } as any;

  beforeEach(() => {
    cartService = {
      getOrCreate: jest.fn().mockResolvedValue(cart),
      findItemByProduct: jest.fn().mockReturnValue(null),
      addItem: jest.fn(),
      setItemQuantity: jest.fn(),
      toView: jest.fn().mockReturnValue({ id: 1 }),
    } as unknown as jest.Mocked<CartService>;

    productService = {
      findOne: jest.fn().mockResolvedValue(product),
    } as unknown as jest.Mocked<ProductService>;

    useCase = new AddCartItemUseCase(cartService, productService);
  });

  it('throws NotFoundException for an inactive product', async () => {
    productService.findOne.mockResolvedValue({ ...product, isActive: false });

    await expect(useCase.execute(1, { productId: 10, quantity: 1 })).rejects.toBeInstanceOf(NotFoundException);

    expect(cartService.getOrCreate).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the quantity exceeds stock', async () => {
    await expect(useCase.execute(1, { productId: 10, quantity: 6 })).rejects.toBeInstanceOf(BadRequestException);

    expect(cartService.addItem).not.toHaveBeenCalled();
  });

  it('adds a new item to the cart', async () => {
    await useCase.execute(1, { productId: 10, quantity: 2 });

    expect(cartService.addItem).toHaveBeenCalledWith(cart, product, 2);
  });

  it('sums the quantity when the product is already in the cart', async () => {
    const existing = { id: 3, quantity: 2 } as any;
    cartService.findItemByProduct.mockReturnValue(existing);

    await useCase.execute(1, { productId: 10, quantity: 3 });

    expect(cartService.setItemQuantity).toHaveBeenCalledWith(existing, 5);
    expect(cartService.addItem).not.toHaveBeenCalled();
  });

  it('rejects when the summed quantity exceeds stock', async () => {
    cartService.findItemByProduct.mockReturnValue({ id: 3, quantity: 4 } as any);

    await expect(useCase.execute(1, { productId: 10, quantity: 2 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
