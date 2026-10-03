# Replicación vertical en NestJS y .NET — Hito 1 (Entidad `Product`)

> Fuente única: proyecto Laravel `FerreteriaPescadoVolador` + `docs/contrato-comparativo.md` (Hito 0, congelado, no modificable después del Hito 1) + PDF `IF0009 Proyecto Programado II Ciclo 2026`.
> En Laravel no se mueve nada. Este archivo es la guía exacta de lo que hay que replicar **1:1 en NestJS (Hito 1, domingo 4 oct) y luego en ASP.NET Core 8 (Hito 2)**.
> Misma base de datos, mismos datos de prueba, mismas rutas, mismos códigos y mismas estructuras. Si cambian los datos, la comparación pierde validez.

## 1. Qué pide el Hito 1 (rúbrica Componente D, 4 pts NestJS)

`Excelente = 6 endpoints funcionales + validación + autenticación + manejo de errores + 3 pruebas.`

- Porción vertical funcional de **una sola entidad**: `Product`.
- Entregable: porción ejecutable + 3 pruebas equivalentes + mediciones registradas.
- Contrato común obligatorio (sección 4.1 del PDF):

| Operación | Método y ruta | Respuesta esperada |
|---|---|---|
| Login | `POST /api/login` | 200 con token; 422 datos inválidos; 401 credenciales incorrectas |
| Listado paginado | `GET /api/recursos?page=&per_page=&q=` | 200 con datos + metadatos; 401 sin token |
| Detalle | `GET /api/recursos/{id}` | 200; 404 si no existe; 403 si no le corresponde / sin permiso |
| Creación | `POST /api/recursos` | 201 con `Location`; 422 datos inválidos |
| Actualización | `PUT /api/recursos/{id}` | 200; 404 si no existe; 422 datos inválidos |
| Eliminación | `DELETE /api/recursos/{id}` | 204; 404 si no existe; 409 si tiene dependencias |

- Entidad del contrato: máximo 8 campos + 1 relación según PDF, pero el `contrato-comparativo.md` del equipo congeló `Product` con 16 atributos + 3 relaciones. **Vale lo congelado en `docs/contrato-comparativo.md`.**
- 8 criterios medibles a registrar con procedimiento reproducible, misma máquina, misma BD, mismo escenario: tiempo puesta en marcha, tamaño (archivos/LOC propias), esfuerzo validación, esfuerzo auth, documentación OpenAPI, pruebas (herramienta + esfuerzo 3 pruebas), rendimiento (rps + latencia p95), huella (RAM reposo + tamaño artefacto). Más 2 valorados: seguridad por omisión (Hito 3) y ecosistema/curva.

## 2. Entidad elegida: `Product` + catálogos mínimos

### 2.1 Definición congelada (`docs/contrato-comparativo.md:5-28`)

| Atributo | Tipo | Restricción |
|---|---|---|
| `id` | int PK autoincrement | único |
| `category_id` | int FK → `categories.id` | requerido |
| `brand_id` | int FK → `brands.id` | requerido |
| `unit_id` | int FK → `units.id` | requerido |
| `name` | varchar 150 | requerido |
| `description` | text | nullable |
| `price` | decimal 10,2 | requerido, >= 0 |
| `stock_quantity` | int | requerido |
| `minimum_stock` | int | alerta reposición |
| `maximum_stock` | int | tope bodega |
| `image_url` | varchar 255 | nullable, URL |
| `sku` | varchar 50 único | requerido, único |
| `barcode` | varchar 50 único | nullable, único (EAN/UPC) |
| `tax_rate` | decimal 5,2 | % impuesto, ej 13.00 |
| `weight` | decimal 8,2 | kg |
| `is_active` | bool tinyint | 1 activo / 0 inactivo |

Relaciones obligatorias: `Category`, `Brand`, `Unit` (N:1). En código además existen `saleItems`, `purchaseItems`, `inventoryMovements` (1:N) — solo importan para la regla R1 (dependencias).

### 2.2 Esquema real en Laravel (lo que manda en código)

`database/migrations/2026_09_09_201000_create_products_table.php:14-45`:

```php
id; category_id FK restrict; brand_id FK restrict; unit_id FK restrict;
name string 200; description text nullable; sku string 50 unique; barcode string 100 unique nullable;
price decimal 12,2; tax_rate decimal 5,2 default 0.13;
stock_quantity int default 0; minimum_stock int default 1; maximum_stock int nullable;
weight decimal 8,2 nullable; image_url string nullable; is_active bool default true;
timestamps; softDeletes;
```

Catálogos mínimos (hay que crearlos en NestJS/.NET aunque sea simplificados):

- `categories`: `id, category_name, description, timestamps` (`200300_create_categories_table.php`).
- `brands`: `id, brand_name, timestamps` (`200200_create_brands_table.php`).
- `units`: `id, unit_name, timestamps` (`200100_create_units_table.php`).

> Discrepancia docs vs código (comparación pedida): contrato dice `name 150 / barcode 50 / price 10,2`; migración usa `name 200 / barcode 100 / price 12,2` + defaults + `softDeletes`. Validación (`StoreProductRequest`) sí aplica `max:150` y `barcode max:50`. Para Hito 1 replicar **validación de 150/50** y **BD con soft delete + FK restrict**. `Product` usa `HasFactory, SoftDeletes` (`app/Models/Product.php:14-17`).

Modelo `app/Models/Product.php:18-57`: `fillable` = 15 campos (todo menos `id`); `hidden` = `created_at, updated_at, deleted_at, image_url, category_id, brand_id, unit_id` (ojo: oculta FKs e imagen en `toArray` base, pero `ProductResource` los re-expone en español); `casts`: `price/tax_rate/weight decimal:2, is_active bool, stocks int`; scopes `active()` y `lowStock()` (`whereColumn stock <= minimum_stock`).

## 3. CRUD real a replicar (rutas + controlador delgado + servicio)

Rutas `routes/api.php:26-37`:

```
POST /api/login (público)
POST /api/register (público, no parte del contrato)
GET /api/products/inventory-summary (extra, no exigir en Hito 1 pero no romper)
GET /api/products | POST /api/products | GET /api/products/{product} | PUT /api/products/{product} | DELETE /api/products/{product}
Todo products bajo auth:sanctum + EnsureTokenHasAbility
```

Controlador `app/Http/Controllers/ProductController.php`: delgado, delega todo a `ProductService`, retorna `ProductResource`:

- `index(Request)` → `listPaginated($request->all())` → `ProductResource::collection` (200 paginado).
- `store(StoreProductRequest)` → `crear(validated)` → 201 + `Location: route(products.show)` .
- `show(Product)` → 200 `ProductResource`.
- `update(UpdateProductRequest, Product)` → `actualizar` → 200.
- `destroy(Product)` → `eliminar` → 204 `null`.
- Autorización en 2 capas: atributo `#[Authorize(...)]` + `Gate::authorize` dentro del Service.

Servicio `app/Services/ProductService.php`:

- `crear(validated)`: `Gate create` + `validateStockCoherence` + `Product::create`.
- `actualizar(product, validated)`: `Gate update` + merge guardado+nuevo para validar coherencia + `update`.
- `eliminar(product)`: `Gate delete` + si `PurchaseItem where product_id exists` → `ProductHasDependenciesException` (→409) + `DB::transaction(delete)` (soft delete).
- `getById(id)`: `findOrFail` (→404) + `Gate view`.
- `listPaginated(filters)`: `Gate viewAny`; `per_page` clamp 1-50 default 10; `sort` whitelist `name, price, stock_quantity, id, created_at` default `id`; `direction asc/desc`; `with(category,brand,unit)` (evita N+1); filtros combinables: `q` (like en `name,sku,barcode`), `category_id`, `brand_id`, `is_active` (bool), `low_stock` (scope), `min_price`, `max_price`; `orderBy(sort,direction)->orderBy(id)` + `paginate->withQueryString`.
- `inventorySummary()`: agregado por categoría (`COUNT, SUM stock, AVG price`) — opcional Hito 1.
- `validateStockCoherence(data)` privada → `InvalidProductStockException` (→409):
  1. `minimum_stock > maximum_stock` → 409
  2. `stock_quantity < minimum_stock` → 409
  3. `stock_quantity > maximum_stock` → 409

## 4. Validaciones declarativas (422 con `errors` por campo, mensajes en español)

`app/Http/Requests/Product/StoreProductRequest.php:24-40` (crear, todos requeridos salvo nulables):

```
category_id: required|exists:categories,id
brand_id: required|exists:brands,id
unit_id: required|exists:units,id
name: required|string|max:150
description: nullable|string|max:1000
price: required|numeric|min:0|max:99999999.99
sku: required|string|max:50|unique:products,sku
barcode: nullable|string|max:50|unique:products,barcode
stock_quantity: required|integer|min:0|max:1000000
tax_rate: nullable|numeric|min:0|max:100
minimum_stock: nullable|integer|min:0|max:1000000
maximum_stock: nullable|integer|min:0|max:1000000
weight: nullable|numeric|min:0|max:100000
image_url: nullable|url|max:255
is_active: boolean (en código sin sometimes; tratar como nullable/boolean en Nest)
```

`app/Http/Requests/Product/UpdateProductRequest.php:19-35` (igual pero `sometimes` + `Rule::unique(...)->ignore(id)` en `sku/barcode`):

```
category_id/brand_id/unit_id/name/price/stock_quantity: sometimes|required|...
description/tax_rate/minimum_stock/maximum_stock/weight/image_url/is_active: sometimes|nullable|...
sku: sometimes|required|string|max:50|unique ignore self
barcode: sometimes|nullable|string|max:50|unique ignore self
```

Mensajes `messages():44-88` en español (ej: `El campo nombre no debe exceder los 150 caracteres.`, `El SKU ingresado ya está en uso.`, `La URL de la imagen debe ser una URL válida.`). En NestJS replicar con `class-validator` mensajes idénticos y filtro que devuelva `{message:'Los datos enviados no son válidos.', errors:{campo:[msgs]}}` + 422. En .NET replicar con `FluentValidation` + `ValidationProblem` adaptado a la misma forma.

Login `app/Http/Requests/Auth/LoginRequest.php:25-29`: `email required|string|email|max:255`, `password required|string`, mensajes en español.

## 5. Reglas de negocio a replicar (solo las de `Product`, pero con su código exacto)

- **R1 — No eliminar con dependencias** (`lab04-negocio.md:17-19`, `ProductService::eliminar:45-47`): si existe `purchase_items.product_id` → 409 `No se puede eliminar el producto porque tiene dependencias activas.` (`ProductHasDependenciesException extends BusinessException`).
- **R2 — Coherencia de stock** (`lab04-negocio.md:21-23`, `validateStockCoherence:168-191`): 3 subcasos → 409 `InvalidProductStockException` con los 3 mensajes exactos (`El stock mínimo no puede ser mayor que el stock máximo.` / `La cantidad en stock no puede ser menor que el stock mínimo.` / `La cantidad en stock no puede superar el stock máximo.`). En update se valida contra el merge (guardado + nuevo).

Transacción: `DB::transaction` en `eliminar`. En NestJS usar `QueryRunner`/transacción TypeORM; en .NET `IDbContextTransaction`. No dejar registros parciales.

## 6. Auth + autorización (idéntico en las 3)

- `POST /api/login {email,password}` → `LoginController::__invoke` → `AuthService::iniciarSesion(email,password,ip)`:
  - Rate limit 5 intentos/min por `email|ip` → 429 con `Retry-After` (`AuthService.php:32-40`).
  - Si usuario no existe o `Hash::check` falla → 401 `Las credenciales proporcionadas son incorrectas.` (mensaje idéntico exista o no).
  - Éxito → token Sanctum `createToken('api', abilities=permisos del rol, expires +2h)` → 200 `{token, token_type:'Bearer', expires_at, abilities}` (`LoginController:23-28`).
  - `POST /api/logout` (con token) borra todos los tokens del usuario.
- Roles/permisos `database/seeders/RolePermissionSeeder.php:20-70` (Spatie):
  - `admin`: todo (`view/create/update/delete` × 12 recursos).
  - `cajero`: `view products, view sales, create sales, view customers` → **puede listar/ver products, NO crear/actualizar/eliminar** (test `ProductApiTest:35-43` espera 403 al borrar).
  - `bodeguero`: `view/create/update products, view purchases, view/suppliers create/update` → **puede todo en products menos borrar**.
  - Permisos de products: `view products, create products, update products, delete products`.
- `ProductPolicy.php:13-45`: `viewAny/view → can(view products)`, `create → can(create products)`, etc. `restore/forceDelete → false`.
- Doble capa: `#[Authorize]` en controller + `Gate::authorize` en service. En NestJS: `AuthGuard + RolesGuard/AbilitiesGuard`; en .NET: `[Authorize(Policy=...)]` + chequeo en servicio. Sin token → 401; con token sin permiso → 403 `No tiene permiso para realizar esta acción.`

Usuarios seed `DatabaseSeeder.php:44-55`: `admin@example.com / cajero@example.com / bodeguero@example.com` (password de `UserFactory`, típicamente `password`).

## 7. Respuestas JSON exactas (contrato de salida)

`ProductResource.php:18-35` — **claves en español** (esto es lo que los tests exigen, `ProductApiTest:16-20,30-32`):

```json
{"data":{"id":1,"id_categoria":1,"id_marca":2,"id_unidad":1,"nombre":"...","descripcion":"...","sku":"...","codigo_barras":"...","precio":12500.0,"tasa_impuesto":0.13,"cantidad_stock":45,"stock_minimo":10,"stock_maximo":100,"peso":"0.45","esta_activo":true}}
```

- Listado: `{data:[...], links:{first,last,prev,next}, meta:{current_page,from,last_page,path,per_page,to,total}}` (`lab05-disenio.md:37-44`, `openapi.yaml:321-340`). Query real: `?page=&per_page=&q=` + extras `sort,direction,category_id,brand_id,is_active,low_stock,min_price,max_price`.
- Códigos: `POST → 201 + Location: /api/products/{id}`; `PUT/GET listado/detalle → 200`; `DELETE → 204 vacío`; `404 inexistente`; `409 regla negocio`; `422 validación`; `401 sin token/credenciales`; `403 sin permiso`.
- Manejo central `bootstrap/app.php:40-81`: `ValidationException → 422 {message:'Los datos enviados no son válidos.', errors}`; `AuthenticationException → 401`; `BusinessException → 409 {message(,errors)}` (no se reporta); `403/404/405/429/500` con mensajes en español sin traza; JSON malformado → 400 (`EnsureJsonBodyIsValid`); método no permitido → 405 + `Allow`.

OpenAPI: `docs/openapi.yaml` (schema `Product:4174-4207` con las claves en español) servido en `/docs/api` (Swagger) + `/docs/openapi.yaml`. Replicar con Swagger NestJS (`@nestjs/swagger`) / Swashbuckle .NET.

## 8. Datos de prueba (usar los mismos en las 3 BDs)

`docs/contrato-comparativo.md:45-143` — 5 productos fijos (Martillo 16oz, Taladro 750W, Pintura blanca 1gal, Cemento Holcim 50kg, Juego destornilladores 6pz) con `category_id/brand_id/unit_id`, `sku SKU-*`, `barcode 750*`, `tax_rate 0.13`, stocks y pesos exactos del archivo. Fábrica genérica `ProductFactory.php:23-46` solo para pruebas adicionales (faker). Misma BD SQLite compartida según PDF; en la práctica del equipo: mismo motor + mismo seed.

## 9. Las 3 pruebas mínimas a replicar (equivalentes Pest → Jest / xUnit)

Basadas en `tests/Feature/ProductApiTest.php`, `BusinessRulesTest.php`, `ApiErrorHandlingTest.php`, `AuthApiTest.php`:

1. **Listado paginado + auth**: `GET /api/products?per_page=2` con rol `cajero` → 200, `data` con 2, `meta.total`, estructura `data/links/meta`. + `GET` sin token → 401.
2. **Crear con 201 + Location + validación 422**: `POST` como `admin` con el Martillo del contrato → 201, `Location: /api/products/{id}`, `data.nombre/codigo_barras`; luego `POST` con `name 151 chars / price -5 / barcode 51 chars / image_url no-url` → 422 + mensaje español por campo y 0 filas nuevas.
3. **Reglas negocio + autorización**: `DELETE` producto con `purchase_items` → 409; `POST/PUT` con `minimum>maximum` o `stock fuera de rango` → 409; `DELETE` como `cajero` → 403 y fila conservada (soft delete: `assertNotSoftDeleted`).

En NestJS: `Jest + Supertest` (`test/jest-e2e.json`); en .NET: `xUnit + WebApplicationFactory`. Cobertura objetivo 70% capa servicio (solo se exigen 3 para Hito 1/2).

## 10. Tabla de equivalencias Laravel → NestJS → .NET

| Pieza Laravel | NestJS (Hito 1) | ASP.NET Core 8 (Hito 2) |
|---|---|---|
| Migración + Eloquent `Product` + `SoftDeletes` | TypeORM entity `Product` + `@DeleteDateColumn()` + migración, `ManyToOne Category/Brand/Unit`, `OneToMany PurchaseItem` | EF Core entity + `IsDeleted` global filter o `SoftDelete`, `HasOne/WithMany`, FK `Restrict` |
| `Store/UpdateProductRequest` | `CreateProductDto` (todos) / `UpdateProductDto extends PartialType` + `class-validator` (`@IsInt,@IsPositive,@MaxLength(150/50/1000),@IsUrl,@IsOptional`) mensajes `message:'...español...'` + `ValidationPipe {whitelist, forbidNonWhitelisted, stopAtFirst? no}` | `CreateProductValidator / UpdateProductValidator` (FluentValidation) + `RuleFor().MaximumLength(150)...WithMessage("...")` |
| `ProductService crear/actualizar/eliminar/listPaginated` | `ProductsService` mismo nombres lógicos + `DataSource.transaction`, `findAndCount` + `withQueryString` manual (`page/per_page/sort/direction/filtros`) | `ProductService` + `DbContextTransaction`, `IQueryable` + `Skip/Take` + `OrderBy` whitelist |
| `ProductResource` (claves español) | Interceptor/serializer `ProductResponseDto` con `@Expose({name})` o mapper manual a las mismas claves | `ProductResponseDto` + AutoMapper/Profile a las mismas claves |
| `ProductPolicy` + `Gate` + `#[Authorize]` | `JwtAuthGuard` + `PermissionsGuard` (`@RequirePermissions('view products'...)`) + chequeo en servicio | `JwtBearer` + `AuthorizationHandler/Policy (CanViewProducts...)` + chequeo en servicio |
| Sanctum token 2h + abilities | `@nestjs/jwt` + `Passport` Bearer, `expiresIn:'2h'`, payload `abilities[]`, throttle `ThrottlerModule 5/min por email|ip` | `JWT Bearer 2h`, `abilities` en claims, `RateLimiter` 5/min |
| `bootstrap/app.php` handler | `HttpExceptionFilter` global: `Validation→422`, `Business→409`, `NotFound→404`, `Forbidden→403`, `Unauthorized→401`, sin stack | `ExceptionHandlerMiddleware` / `ProblemDetails` mismo mapeo |
| `ProductFactory/Seeder` + 5 fijos | TypeORM `seed.ts` / `typeorm-seeding` mismos 5 + `admin/cajero/bodeguero` | `HasData` / `Bogus` mismos 5 + mismos usuarios |
| Pest `ProductApiTest` | `Jest e2e products.e2e-spec.ts` (3 tests) | `xUnit ProductsApiTests` (3 tests) |
| `openapi.yaml` + Swagger `/docs/api` | `@nestjs/swagger` mismo `Product` español | `Swashbuckle` mismo schema |

## 11. Estado actual del repo NestJS y qué falta

`Proyecto-Desarrollo-IV-Product-NESTJS/src/products/` hoy es scaffold vacío: `products.controller.ts` usa `@Patch` (Laravel exige `PUT`), sin prefijo `api`, sin `auth`, sin DTOs (`create-product.dto.ts` vacío, `update-product.dto.ts` solo `PartialType`), `product.entity.ts` vacía, `products.service.ts` retorna strings. `package.json` ya trae `@nestjs/typeorm+typeorm+sqlite3` pero falta `class-validator, class-transformer, @nestjs/jwt, @nestjs/passport, passport-jwt, @nestjs/swagger, @nestjs/throttler, bcrypt`.

Checklist Hito 1 para dar Excelente:

- [ ] `POST /api/login`, `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` con los códigos exactos §1+§7.
- [ ] Prefijo global `api`, `ValidationPipe` global, filtro global, `PUT` (no `PATCH`), `Location` en crear, `204` en borrar.
- [ ] DTOs con las reglas §4 y mensajes españoles idénticos; `unique sku/barcode` (ignorar self en update); `exists category/brand/unit`.
- [ ] `R1` y `R2` con mensajes 409 idénticos + transacción.
- [ ] JWT 2h + abilities + 3 roles/permisos §6 + throttle login + 401/403/422/404/409 idénticos.
- [ ] Respuesta `Product` en español + paginación `data/links/meta` idéntica.
- [ ] Seed con los 5 productos + 3 usuarios; misma BD que Laravel/.NET.
- [ ] 3 e2e equivalentes §9 + `npm test` verde; registrar las 8 mediciones con procedimiento reproducible.

## 12. Archivos Laravel de referencia (no tocar, solo leer)

- Contrato: `docs/contrato-comparativo.md`, `docs/openapi.yaml:112-230,214-700,4174-4207`, `docs/lab04-negocio.md:1-66`, `docs/lab05-disenio.md:1-74`.
- Product: `app/Models/Product.php`, `app/Services/ProductService.php`, `app/Http/Controllers/ProductController.php`, `app/Http/Requests/Product/StoreProductRequest.php`, `UpdateProductRequest.php`, `app/Http/Resources/ProductResource.php`, `app/Policies/ProductPolicy.php`, `database/migrations/2026_09_09_201000_create_products_table.php`, `database/factories/ProductFactory.php`, `routes/api.php`, `bootstrap/app.php`.
- Auth/roles: `app/Http/Controllers/LoginController.php`, `app/Services/AuthService.php`, `app/Http/Requests/Auth/LoginRequest.php`, `database/seeders/RolePermissionSeeder.php`, `DatabaseSeeder.php`.
- Pruebas modelo: `tests/Feature/ProductApiTest.php`, `tests/Feature/BusinessRulesTest.php`, `tests/Feature/AuthApiTest.php`, `tests/Feature/ApiErrorHandlingTest.php`, `tests/Unit/Services/ProductServiceTest.php`.
