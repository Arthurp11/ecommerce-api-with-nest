import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, FilterQuery, QueryOrderMap } from '@mikro-orm/postgresql';
import { Product } from './entities/product.entity';
import { Category } from 'src/category/entities/category.entity';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import { paginate } from 'src/common/dto/pagination-query.dto';

type ProductData = Omit<Partial<Product>, 'category'> & { category?: Category };

const SORT_ORDER: Record<ProductSort, QueryOrderMap<Product>> = {
  [ProductSort.NEWEST]: { createdAt: 'desc', id: 'desc' },
  [ProductSort.PRICE_ASC]: { priceInCents: 'asc', id: 'asc' },
  [ProductSort.PRICE_DESC]: { priceInCents: 'desc', id: 'desc' },
};

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
  ) {}

  async findAllActive(query: ProductQueryDto) {
    const where: FilterQuery<Product> = { isActive: true };

    if (query.search) {
      const escaped = query.search.replace(/[\\%_]/g, (char) => `\\${char}`);
      where.name = { $ilike: `%${escaped}%` };
    }

    if (query.categoryId) {
      where.category = query.categoryId;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.priceInCents = {
        ...(query.minPrice !== undefined && { $gte: query.minPrice }),
        ...(query.maxPrice !== undefined && { $lte: query.maxPrice }),
      };
    }

    const [products, total] = await this.productRepository.findAndCount(where, {
      populate: ['category'],
      orderBy: SORT_ORDER[query.sort],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    return paginate(products, total, query);
  }

  findActiveBySlug(slug: string) {
    return this.productRepository.findOne({ slug, isActive: true }, { populate: ['category'] });
  }

  findOne(id: number) {
    return this.productRepository.findOne({ id });
  }

  findBySku(sku: string) {
    return this.productRepository.findOne({ sku });
  }

  async slugExists(slug: string) {
    return (await this.productRepository.count({ slug })) > 0;
  }

  async create(data: ProductData) {
    const product = this.productRepository.create(data as Product);
    await this.productRepository.getEntityManager().persist(product).flush();
    return product;
  }

  async update(product: Product, data: ProductData) {
    this.productRepository.assign(product, data);
    await this.productRepository.getEntityManager().flush();
    return product;
  }
}
