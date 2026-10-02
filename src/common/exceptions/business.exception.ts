import { ConflictException } from '@nestjs/common';

/**
 * Base de las reglas de negocio. Laravel las mapea a 409 en `bootstrap/app.php`.
 */
export class BusinessException extends ConflictException {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(errors ? { message, errors } : { message });
  }
}

/** R1: no se puede eliminar un producto referenciado por `purchase_items`. */
export class ProductHasDependenciesException extends BusinessException {
  constructor() {
    super('No se puede eliminar el producto porque tiene dependencias activas.');
  }
}

/** R2: coherencia de stock (mínimo/stock/máximo). */
export class InvalidProductStockException extends BusinessException {
  constructor(message: string) {
    super(message);
  }
}
