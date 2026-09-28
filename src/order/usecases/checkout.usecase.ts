import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { OrderService } from '../order.service';
import { CheckoutDto } from '../dto/checkout.dto';
import { Order, ShippingAddress } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import { CartItem } from 'src/cart/entities/cart-item.entity';
import { Address } from 'src/address/entities/address.entity';
import { Product } from 'src/product/entities/product.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class CheckoutUseCase {
  private readonly logger = new Logger(CheckoutUseCase.name);

  constructor(
    private readonly em: EntityManager,
    private readonly orderService: OrderService,
  ) {}

  async execute(userId: number, { addressId }: CheckoutDto) {
    this.logger.log(`Checking out cart of user ${userId}...`);

    const order = await this.em.transactional(async (em) => {
      const cart = await em.findOne(Cart, { user: userId }, { populate: ['items'] });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const address = await em.findOne(Address, { id: addressId, user: userId });

      if (!address) {
        throw new NotFoundException(`Address with ID ${addressId} not found`);
      }

      const cartItems = cart.items.getItems();
      const products = await this.orderService.lockProducts(em, cartItems.map((item) => item.product.id));

      this.ensureAvailability(cartItems, products);

      const subtotalInCents = cartItems.reduce(
        (sum, { product, quantity }) => sum + products.get(product.id)!.priceInCents * quantity,
        0,
      );

      const order = em.create(Order, {
        user: em.getReference(User, userId),
        shippingAddress: this.toShippingAddress(address),
        subtotalInCents,
        totalInCents: subtotalInCents,
      });

      for (const { product: { id }, quantity } of cartItems) {
        const product = products.get(id)!;
        product.stock -= quantity;
        order.items.add(this.toOrderItem(em, order, product, quantity));
      }

      cart.items.removeAll();

      return order;
    });

    this.logger.log(`Order ${order.id} created for user ${userId}`);

    return order;
  }

  private ensureAvailability(cartItems: CartItem[], products: Map<number, Product>) {
    const problems: string[] = [];

    for (const { product: { id }, quantity } of cartItems) {
      const product = products.get(id);

      if (!product?.isActive) {
        problems.push(`${product?.name ?? `Product ${id}`} is no longer available`);
      } else if (product.stock < quantity) {
        problems.push(`Only ${product.stock} unit(s) of ${product.name} available`);
      }
    }

    if (problems.length > 0) {
      throw new ConflictException(problems.join('; '));
    }
  }

  private toOrderItem(em: EntityManager, order: Order, product: Product, quantity: number) {
    return em.create(OrderItem, {
      order,
      product,
      productName: product.name,
      sku: product.sku,
      unitPriceInCents: product.priceInCents,
      quantity,
      lineTotalInCents: product.priceInCents * quantity,
    });
  }

  private toShippingAddress(address: Address): ShippingAddress {
    return {
      recipientName: address.recipientName,
      zipCode: address.zipCode,
      street: address.street,
      number: address.number,
      complement: address.complement ?? null,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
    };
  }
}
