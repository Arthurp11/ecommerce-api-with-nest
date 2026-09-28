import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from 'src/product/entities/product.entity';
import { User } from 'src/user/entities/user.entity';

export interface CartItemView {
  id: number;
  quantity: number;
  lineTotalInCents: number;
  product: Pick<Product, 'id' | 'name' | 'slug' | 'priceInCents' | 'images' | 'stock' | 'isActive'>;
}

export interface CartView {
  id: number;
  items: CartItemView[];
  itemCount: number;
  subtotalInCents: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: EntityRepository<Cart>,
  ) {}

  findByUser(userId: number) {
    return this.cartRepository.findOne(
      { user: userId },
      { populate: ['items.product'], orderBy: { items: { id: 'asc' } } },
    );
  }

  async getOrCreate(userId: number) {
    const existing = await this.findByUser(userId);

    if (existing) {
      return existing;
    }

    const em = this.cartRepository.getEntityManager();
    const cart = this.cartRepository.create({ user: em.getReference(User, userId) } as Cart);
    await em.persist(cart).flush();
    return cart;
  }

  findItem(cart: Cart, itemId: number) {
    return cart.items.getItems().find((item) => item.id === itemId) ?? null;
  }

  findItemByProduct(cart: Cart, productId: number) {
    return cart.items.getItems().find((item) => item.product.id === productId) ?? null;
  }

  async addItem(cart: Cart, product: Product, quantity: number) {
    const em = this.cartRepository.getEntityManager();
    const item = em.create(CartItem, { cart, product, quantity } as CartItem);
    cart.items.add(item);
    await em.flush();
    return item;
  }

  async setItemQuantity(item: CartItem, quantity: number) {
    item.quantity = quantity;
    await this.cartRepository.getEntityManager().flush();
    return item;
  }

  async removeItem(cart: Cart, item: CartItem) {
    cart.items.remove(item);
    await this.cartRepository.getEntityManager().flush();
  }

  async clear(cart: Cart) {
    cart.items.removeAll();
    await this.cartRepository.getEntityManager().flush();
  }

  toView(cart: Cart): CartView {
    const items = cart.items.getItems().map(({ id, quantity, product }): CartItemView => ({
      id,
      quantity,
      lineTotalInCents: quantity * product.priceInCents,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        priceInCents: product.priceInCents,
        images: product.images,
        stock: product.stock,
        isActive: product.isActive,
      },
    }));

    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalInCents: items.reduce((sum, item) => sum + item.lineTotalInCents, 0),
    };
  }
}
