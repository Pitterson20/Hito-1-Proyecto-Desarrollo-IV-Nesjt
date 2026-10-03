import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { Product } from './../src/products/entities/product.entity';
import { PurchaseItem } from './../src/products/entities/purchase-item.entity';

describe('Products API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/login')
      .send({ email, password: 'password' })
      .expect(200);
    return response.body.token as string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  // 1. Listado paginado + auth (rol cajero).
  it('1. listado paginado con estructura data/links/meta y 401 sin token', async () => {
    const token = await login('cajero@example.com');

    const response = await request(app.getHttpServer())
      .get('/api/products?per_page=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.total).toBe(5);
    expect(response.body.meta.current_page).toBe(1);
    expect(response.body).toHaveProperty('links.first');
    expect(response.body).toHaveProperty('links.last');
    expect(response.body.data[0]).toHaveProperty('nombre');
    expect(response.body.data[0]).toHaveProperty('codigo_barras');

    await request(app.getHttpServer()).get('/api/products').expect(401);
  });

  // 2. Crear (201 + Location + validación 422).
  it('2. crear producto con 201/Location y rechazar datos inválidos con 422', async () => {
    const token = await login('admin@example.com');
    const productRepo = dataSource.getRepository(Product);

    const created = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_id: 1,
        brand_id: 1,
        unit_id: 1,
        name: 'Martillo 16oz',
        description: 'Martillo de acero con mango de fibra',
        price: 12500.0,
        sku: 'SKU-NEW-001',
        barcode: '7509999999999',
        stock_quantity: 45,
        minimum_stock: 10,
        maximum_stock: 100,
        tax_rate: 0.13,
        weight: 0.45,
        is_active: true,
      })
      .expect(201);

    expect(created.headers.location).toMatch(/^\/api\/products\/\d+$/);
    expect(created.body.data.nombre).toBe('Martillo 16oz');
    expect(created.body.data.codigo_barras).toBe('7509999999999');

    const before = await productRepo.count();

    const invalid = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_id: 1,
        brand_id: 1,
        unit_id: 1,
        name: 'x'.repeat(151),
        price: -5,
        sku: 'SKU-BAD-001',
        barcode: 'y'.repeat(51),
        stock_quantity: 1,
        image_url: 'no-es-una-url',
      })
      .expect(422);

    expect(invalid.body.message).toBe('Los datos enviados no son válidos.');
    expect(invalid.body.errors).toHaveProperty('name');
    expect(invalid.body.errors).toHaveProperty('price');
    expect(invalid.body.errors).toHaveProperty('barcode');
    expect(invalid.body.errors).toHaveProperty('image_url');

    expect(await productRepo.count()).toBe(before);
  });

  // 3. Reglas de negocio (R1/R2) + autorización.
  it('3. R1 dependencias, R2 stock y 403 para cajero', async () => {
    const admin = await login('admin@example.com');
    const cajero = await login('cajero@example.com');

    const created = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        category_id: 1,
        brand_id: 1,
        unit_id: 1,
        name: 'Producto con dependencias',
        price: 100,
        sku: 'SKU-R1-001',
        stock_quantity: 10,
        minimum_stock: 1,
        maximum_stock: 50,
      })
      .expect(201);
    const productId = created.body.data.id as number;

    const purchaseItemRepo = dataSource.getRepository(PurchaseItem);
    await purchaseItemRepo.save(
      purchaseItemRepo.create({ productId, quantity: 1 }),
    );

    const dependency = await request(app.getHttpServer())
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(409);
    expect(dependency.body.message).toBe(
      'No se puede eliminar el producto porque tiene dependencias activas.',
    );

    const badStock = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        category_id: 1,
        brand_id: 1,
        unit_id: 1,
        name: 'Stock incoherente',
        price: 100,
        sku: 'SKU-R2-001',
        stock_quantity: 5,
        minimum_stock: 100,
        maximum_stock: 10,
      })
      .expect(409);
    expect(badStock.body.message).toBe(
      'El stock mínimo no puede ser mayor que el stock máximo.',
    );

    await request(app.getHttpServer())
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ stock_quantity: 999999 })
      .expect(409);

    await request(app.getHttpServer())
      .delete('/api/products/2')
      .set('Authorization', `Bearer ${cajero}`)
      .expect(403);

    const stillThere = await request(app.getHttpServer())
      .get('/api/products/2')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(stillThere.body.data.id).toBe(2);
  });
});
