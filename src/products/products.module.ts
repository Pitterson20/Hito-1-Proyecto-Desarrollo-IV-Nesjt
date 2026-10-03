import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { Category } from '../catalogs/entities/category.entity';
import { Brand } from '../catalogs/entities/brand.entity';
import { Unit } from '../catalogs/entities/unit.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, PurchaseItem, Category, Brand, Unit]),
    AuthModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
