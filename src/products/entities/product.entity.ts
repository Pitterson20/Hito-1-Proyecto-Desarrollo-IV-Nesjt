import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../catalogs/entities/category.entity';
import { Brand } from '../../catalogs/entities/brand.entity';
import { Unit } from '../../catalogs/entities/unit.entity';
import { PurchaseItem } from './purchase-item.entity';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'category_id', type: 'int' })
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'brand_id', type: 'int' })
  brandId: number;

  @ManyToOne(() => Brand, (brand) => brand.products, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'unit_id', type: 'int' })
  unitId: number;

  @ManyToOne(() => Unit, (unit) => unit.products, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  barcode: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  price: number;

  @Column({
    name: 'tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.13,
    transformer: numericTransformer,
  })
  taxRate: number;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ name: 'minimum_stock', type: 'int', default: 1 })
  minimumStock: number;

  @Column({ name: 'maximum_stock', type: 'int', nullable: true })
  maximumStock: number | null;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  weight: number | null;

  @Column({ name: 'image_url', type: 'varchar', length: 255, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => PurchaseItem, (item) => item.product)
  purchaseItems: PurchaseItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
