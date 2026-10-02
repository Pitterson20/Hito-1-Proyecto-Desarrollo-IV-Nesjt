import { Product } from '../products/entities/product.entity';
import { PurchaseItem } from '../products/entities/purchase-item.entity';
import { Category } from '../catalogs/entities/category.entity';
import { Brand } from '../catalogs/entities/brand.entity';
import { Unit } from '../catalogs/entities/unit.entity';
import { User } from '../users/entities/user.entity';

export const ENTITIES = [
  Product,
  PurchaseItem,
  Category,
  Brand,
  Unit,
  User,
];
