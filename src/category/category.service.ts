import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Category } from './entities/category.entity';
import { Product } from 'src/product/entities/product.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: EntityRepository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
  ) {}

  findAll() {
    return this.categoryRepository.findAll({ orderBy: { name: 'asc' } });
  }

  findOne(id: number) {
    return this.categoryRepository.findOne({ id });
  }

  findBySlug(slug: string) {
    return this.categoryRepository.findOne({ slug });
  }

  findByName(name: string) {
    return this.categoryRepository.findOne({ name });
  }

  async slugExists(slug: string) {
    return (await this.categoryRepository.count({ slug })) > 0;
  }

  countProducts(categoryId: number) {
    return this.productRepository.count({ category: categoryId });
  }

  async create(data: Pick<Category, 'name' | 'slug' | 'description'>) {
    const category = this.categoryRepository.create(data);
    await this.categoryRepository.getEntityManager().persist(category).flush();
    return category;
  }

  async update(category: Category, data: Partial<Pick<Category, 'name' | 'description'>>) {
    this.categoryRepository.assign(category, data);
    await this.categoryRepository.getEntityManager().flush();
    return category;
  }

  async remove(category: Category) {
    await this.categoryRepository.getEntityManager().remove(category).flush();
  }
}
