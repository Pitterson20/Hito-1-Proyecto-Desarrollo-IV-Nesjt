import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { Category } from '../catalogs/entities/category.entity';
import { Brand } from '../catalogs/entities/brand.entity';
import { Unit } from '../catalogs/entities/unit.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductResponse,
  toProductResponse,
} from './dto/product-response';
import {
  InvalidProductStockException,
  ProductHasDependenciesException,
} from '../common/exceptions/business.exception';
import { validationException } from '../common/exceptions/validation.exception';
import { AuthUser } from '../common/decorators/current-user.decorator';

type QueryParams = Record<string, unknown>;

const SORT_COLUMNS: Record<string, string> = {
  name: 'product.name',
  price: 'product.price',
  stock_quantity: 'product.stock_quantity',
  id: 'product.id',
  created_at: 'product.created_at',
};

const NOT_FOUND_MESSAGE = 'El producto no fue encontrado.';
const FORBIDDEN_MESSAGE = 'No tiene permiso para realizar esta acción.';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepository: Repository<PurchaseItem>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly dataSource: DataSource,
  ) {}

  async listPaginated(
    query: QueryParams,
    user: AuthUser | undefined,
    url: string,
  ): Promise<Record<string, unknown>> {
    this.authorize(user, 'view products');

    const page = this.positiveInt(query.page, 1);
    const perPage = Math.min(50, this.positiveInt(query.per_page, 10));
    const sortColumn =
      SORT_COLUMNS[this.firstValue(query.sort) ?? 'id'] ?? SORT_COLUMNS.id;
    const direction =
      this.firstValue(query.direction)?.toLowerCase() === 'desc'
        ? 'DESC'
        : 'ASC';

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.unit', 'unit');

    const q = this.firstValue(query.q);
    if (q) {
      qb.andWhere(
        '(product.name LIKE :q OR product.sku LIKE :q OR product.barcode LIKE :q)',
        { q: `%${q}%` },
      );
    }

    const categoryId = this.numberValue(query.category_id);
    if (categoryId !== undefined) {
      qb.andWhere('product.category_id = :categoryId', { categoryId });
    }

    const brandId = this.numberValue(query.brand_id);
    if (brandId !== undefined) {
      qb.andWhere('product.brand_id = :brandId', { brandId });
    }

    const isActive = this.booleanValue(query.is_active);
    if (isActive !== undefined) {
      qb.andWhere('product.is_active = :isActive', {
        isActive: isActive ? 1 : 0,
      });
    }

    if (this.booleanValue(query.low_stock) === true) {
      qb.andWhere('product.stock_quantity <= product.minimum_stock');
    }

    const minPrice = this.numberValue(query.min_price);
    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }

    const maxPrice = this.numberValue(query.max_price);
    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    const [products, total] = await qb
      .orderBy(sortColumn, direction)
      .addOrderBy('product.id', 'ASC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const path = url.split('?')[0];
    const from = total === 0 ? null : (page - 1) * perPage + 1;
    const to = total === 0 ? null : Math.min(page * perPage, total);

    return {
      data: products.map(toProductResponse),
      links: {
        first: this.buildPageLink(path, query, 1),
        last: this.buildPageLink(path, query, lastPage),
        prev: page > 1 ? this.buildPageLink(path, query, page - 1) : null,
        next: page < lastPage ? this.buildPageLink(path, query, page + 1) : null,
      },
      meta: {
        current_page: page,
        from,
        last_page: lastPage,
        path,
        per_page: perPage,
        to,
        total,
      },
    };
  }

  async getById(
    id: string | number,
    user: AuthUser | undefined,
  ): Promise<ProductResponse> {
    this.authorize(user, 'view products');
    const product = await this.findOrFail(id);
    return toProductResponse(product);
  }

  async create(
    dto: CreateProductDto,
    user: AuthUser | undefined,
  ): Promise<ProductResponse> {
    this.authorize(user, 'create products');
    await this.validateReferences(dto);
    await this.validateUnique(dto.sku, dto.barcode);
    this.validateStockCoherence({
      minimum_stock: dto.minimum_stock ?? null,
      maximum_stock: dto.maximum_stock ?? null,
      stock_quantity: dto.stock_quantity ?? null,
    });

    const product = this.productRepository.create({
      categoryId: dto.category_id,
      brandId: dto.brand_id,
      unitId: dto.unit_id,
      name: dto.name,
      description: dto.description ?? null,
      sku: dto.sku,
      barcode: dto.barcode ?? null,
      price: dto.price,
      taxRate: dto.tax_rate ?? 0.13,
      stockQuantity: dto.stock_quantity,
      minimumStock: dto.minimum_stock ?? 1,
      maximumStock: dto.maximum_stock ?? null,
      weight: dto.weight ?? null,
      imageUrl: dto.image_url ?? null,
      isActive: dto.is_active ?? true,
    });

    const saved = await this.productRepository.save(product);
    return toProductResponse(saved);
  }

  async update(
    id: string | number,
    dto: UpdateProductDto,
    user: AuthUser | undefined,
  ): Promise<ProductResponse> {
    this.authorize(user, 'update products');
    const existing = await this.findOrFail(id);
    await this.validateReferences(dto);
    await this.validateUnique(dto.sku, dto.barcode, existing.id);

    this.validateStockCoherence({
      minimum_stock:
        dto.minimum_stock !== undefined
          ? dto.minimum_stock
          : existing.minimumStock,
      maximum_stock:
        dto.maximum_stock !== undefined
          ? dto.maximum_stock
          : existing.maximumStock,
      stock_quantity:
        dto.stock_quantity !== undefined
          ? dto.stock_quantity
          : existing.stockQuantity,
    });

    const changes: Partial<Product> = {};
    if (dto.category_id !== undefined) changes.categoryId = dto.category_id;
    if (dto.brand_id !== undefined) changes.brandId = dto.brand_id;
    if (dto.unit_id !== undefined) changes.unitId = dto.unit_id;
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.price !== undefined) changes.price = dto.price;
    if (dto.sku !== undefined) changes.sku = dto.sku;
    if (dto.barcode !== undefined) changes.barcode = dto.barcode;
    if (dto.tax_rate !== undefined) changes.taxRate = dto.tax_rate;
    if (dto.stock_quantity !== undefined) {
      changes.stockQuantity = dto.stock_quantity;
    }
    if (dto.minimum_stock !== undefined) {
      changes.minimumStock = dto.minimum_stock;
    }
    if (dto.maximum_stock !== undefined) {
      changes.maximumStock = dto.maximum_stock;
    }
    if (dto.weight !== undefined) changes.weight = dto.weight;
    if (dto.image_url !== undefined) changes.imageUrl = dto.image_url;
    if (dto.is_active !== undefined) changes.isActive = dto.is_active;

    const saved = await this.productRepository.save(
      this.productRepository.merge(existing, changes),
    );
    return toProductResponse(saved);
  }

  async remove(id: string | number, user: AuthUser | undefined): Promise<void> {
    this.authorize(user, 'delete products');
    const existing = await this.findOrFail(id);

    const dependencies = await this.purchaseItemRepository.count({
      where: { productId: existing.id },
    });
    if (dependencies > 0) {
      throw new ProductHasDependenciesException();
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.softDelete(Product, existing.id);
    });
  }

  private async findOrFail(id: string | number): Promise<Product> {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    const product = await this.productRepository.findOne({
      where: { id: numericId },
    });
    if (!product) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    return product;
  }

  private authorize(user: AuthUser | undefined, permission: string): void {
    if (!user || !user.abilities?.includes(permission)) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }
  }

  private async validateReferences(
    dto: Partial<CreateProductDto>,
  ): Promise<void> {
    const errors: Record<string, string[]> = {};

    if (dto.category_id !== undefined) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.category_id },
      });
      if (!category) {
        errors.category_id = ['La categoría seleccionada no es válida.'];
      }
    }
    if (dto.brand_id !== undefined) {
      const brand = await this.brandRepository.findOne({
        where: { id: dto.brand_id },
      });
      if (!brand) {
        errors.brand_id = ['La marca seleccionada no es válida.'];
      }
    }
    if (dto.unit_id !== undefined) {
      const unit = await this.unitRepository.findOne({
        where: { id: dto.unit_id },
      });
      if (!unit) {
        errors.unit_id = ['La unidad seleccionada no es válida.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      throw validationException(errors);
    }
  }

  private async validateUnique(
    sku?: string,
    barcode?: string | null,
    ignoreId?: number,
  ): Promise<void> {
    const errors: Record<string, string[]> = {};

    if (sku !== undefined) {
      const existing = await this.productRepository.findOne({
        where: { sku },
        withDeleted: true,
      });
      if (existing && existing.id !== ignoreId) {
        errors.sku = ['El SKU ingresado ya está en uso.'];
      }
    }

    if (barcode !== undefined && barcode !== null) {
      const existing = await this.productRepository.findOne({
        where: { barcode },
        withDeleted: true,
      });
      if (existing && existing.id !== ignoreId) {
        errors.barcode = ['El código de barras ingresado ya está en uso.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      throw validationException(errors);
    }
  }

  private validateStockCoherence(data: {
    minimum_stock?: number | null;
    maximum_stock?: number | null;
    stock_quantity?: number | null;
  }): void {
    const min = data.minimum_stock ?? undefined;
    const max = data.maximum_stock ?? undefined;
    const stock = data.stock_quantity ?? undefined;

    if (min !== undefined && max !== undefined && min > max) {
      throw new InvalidProductStockException(
        'El stock mínimo no puede ser mayor que el stock máximo.',
      );
    }
    if (min !== undefined && stock !== undefined && stock < min) {
      throw new InvalidProductStockException(
        'La cantidad en stock no puede ser menor que el stock mínimo.',
      );
    }
    if (max !== undefined && stock !== undefined && stock > max) {
      throw new InvalidProductStockException(
        'La cantidad en stock no puede superar el stock máximo.',
      );
    }
  }

  private buildPageLink(
    path: string,
    query: QueryParams,
    page: number,
  ): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const single = this.firstValue(value);
      if (key === 'page' || single === undefined) {
        continue;
      }
      params.set(key, single);
    }
    params.set('page', String(page));
    return `${path}?${params.toString()}`;
  }

  private firstValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return value.length > 0 ? String(value[0]) : undefined;
    }
    if (value === undefined || value === null) {
      return undefined;
    }
    return String(value);
  }

  private numberValue(value: unknown): number | undefined {
    const single = this.firstValue(value);
    if (single === undefined || single === '') {
      return undefined;
    }
    const parsed = Number(single);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private booleanValue(value: unknown): boolean | undefined {
    const single = this.firstValue(value)?.toLowerCase();
    if (single === undefined) {
      return undefined;
    }
    return ['1', 'true'].includes(single);
  }

  private positiveInt(value: unknown, fallback: number): number {
    const parsed = Number.parseInt(this.firstValue(value) ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
