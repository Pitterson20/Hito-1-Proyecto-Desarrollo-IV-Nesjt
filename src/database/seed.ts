import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Category } from '../catalogs/entities/category.entity';
import { Brand } from '../catalogs/entities/brand.entity';
import { Unit } from '../catalogs/entities/unit.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

/**
 * Datos de prueba congelados en `docs/contrato-comparativo.md` (5 productos) y
 * los 3 usuarios seed de Laravel. Idempotente: no duplica filas.
 */
export async function runSeed(dataSource: DataSource): Promise<void> {
  await seedUsers(dataSource);
  await seedProducts(dataSource);
}

async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  if ((await userRepo.count()) > 0) {
    return;
  }

  const password = bcrypt.hashSync('password', 10);
  await userRepo.save([
    userRepo.create({
      name: 'Administrador',
      email: 'admin@example.com',
      password,
      role: 'admin',
    }),
    userRepo.create({
      name: 'Cajero',
      email: 'cajero@example.com',
      password,
      role: 'cajero',
    }),
    userRepo.create({
      name: 'Bodeguero',
      email: 'bodeguero@example.com',
      password,
      role: 'bodeguero',
    }),
  ]);
}

async function seedProducts(dataSource: DataSource): Promise<void> {
  const productRepo = dataSource.getRepository(Product);
  if ((await productRepo.count()) > 0) {
    return;
  }

  const categoryRepo = dataSource.getRepository(Category);
  const brandRepo = dataSource.getRepository(Brand);
  const unitRepo = dataSource.getRepository(Unit);

  const [manuales, electricas, pintura, construccion] = await categoryRepo.save([
    categoryRepo.create({
      categoryName: 'Herramientas manuales',
      description: 'Herramientas de uso manual',
    }),
    categoryRepo.create({
      categoryName: 'Herramientas eléctricas',
      description: 'Herramientas que requieren energía eléctrica',
    }),
    categoryRepo.create({
      categoryName: 'Pintura',
      description: 'Pinturas y recubrimientos',
    }),
    categoryRepo.create({
      categoryName: 'Construcción',
      description: 'Materiales de construcción',
    }),
  ]);

  const [truper, dewalt, sherwin, holcim, stanley] = await brandRepo.save([
    brandRepo.create({ brandName: 'Truper' }),
    brandRepo.create({ brandName: 'DeWalt' }),
    brandRepo.create({ brandName: 'Sherwin-Williams' }),
    brandRepo.create({ brandName: 'Holcim' }),
    brandRepo.create({ brandName: 'Stanley' }),
  ]);

  const [unidad, galon, saco, juego] = await unitRepo.save([
    unitRepo.create({ unitName: 'Unidad' }),
    unitRepo.create({ unitName: 'Galón' }),
    unitRepo.create({ unitName: 'Saco' }),
    unitRepo.create({ unitName: 'Juego' }),
  ]);

  await productRepo.save([
    productRepo.create({
      categoryId: manuales.id,
      brandId: truper.id,
      unitId: unidad.id,
      name: 'Martillo 16oz',
      description: 'Martillo de acero con mango de fibra',
      sku: 'SKU-001',
      barcode: '7501000000019',
      price: 12500.0,
      taxRate: 0.13,
      stockQuantity: 45,
      minimumStock: 10,
      maximumStock: 100,
      weight: 0.45,
      imageUrl: null,
      isActive: true,
    }),
    productRepo.create({
      categoryId: electricas.id,
      brandId: dewalt.id,
      unitId: unidad.id,
      name: 'Taladro 750W',
      description: 'Taladro percutor 750W',
      sku: 'SKU-002',
      barcode: '7501000000026',
      price: 85000.0,
      taxRate: 0.13,
      stockQuantity: 20,
      minimumStock: 5,
      maximumStock: 50,
      weight: 2.1,
      imageUrl: null,
      isActive: true,
    }),
    productRepo.create({
      categoryId: pintura.id,
      brandId: sherwin.id,
      unitId: galon.id,
      name: 'Pintura blanca 1gal',
      description: 'Pintura acrílica blanca',
      sku: 'SKU-003',
      barcode: '7501000000033',
      price: 35000.0,
      taxRate: 0.13,
      stockQuantity: 60,
      minimumStock: 15,
      maximumStock: 120,
      weight: 4.0,
      imageUrl: null,
      isActive: true,
    }),
    productRepo.create({
      categoryId: construccion.id,
      brandId: holcim.id,
      unitId: saco.id,
      name: 'Cemento Holcim 50kg',
      description: 'Cemento gris de uso general',
      sku: 'SKU-004',
      barcode: '7501000000040',
      price: 9500.0,
      taxRate: 0.13,
      stockQuantity: 200,
      minimumStock: 50,
      maximumStock: 500,
      weight: 50.0,
      imageUrl: null,
      isActive: true,
    }),
    productRepo.create({
      categoryId: manuales.id,
      brandId: stanley.id,
      unitId: juego.id,
      name: 'Juego destornilladores 6pz',
      description: 'Set de 6 destornilladores',
      sku: 'SKU-005',
      barcode: '7501000000057',
      price: 18000.0,
      taxRate: 0.13,
      stockQuantity: 35,
      minimumStock: 10,
      maximumStock: 80,
      weight: 0.8,
      imageUrl: null,
      isActive: true,
    }),
  ]);
}
