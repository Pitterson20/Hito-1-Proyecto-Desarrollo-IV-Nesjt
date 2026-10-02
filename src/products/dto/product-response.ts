import { Product } from '../entities/product.entity';

/**
 * Equivalente a `ProductResource.php`: expone la entidad con claves en español.
 * `peso` se serializa como string decimal para conservar el contrato.
 */
export interface ProductResponse {
  id: number;
  id_categoria: number;
  id_marca: number;
  id_unidad: number;
  nombre: string;
  descripcion: string | null;
  sku: string;
  codigo_barras: string | null;
  precio: number;
  tasa_impuesto: number;
  cantidad_stock: number;
  stock_minimo: number;
  stock_maximo: number | null;
  peso: string | null;
  esta_activo: boolean;
}

export function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    id_categoria: product.categoryId,
    id_marca: product.brandId,
    id_unidad: product.unitId,
    nombre: product.name,
    descripcion: product.description,
    sku: product.sku,
    codigo_barras: product.barcode,
    precio: product.price,
    tasa_impuesto: product.taxRate,
    cantidad_stock: product.stockQuantity,
    stock_minimo: product.minimumStock,
    stock_maximo: product.maximumStock,
    peso:
      product.weight === null || product.weight === undefined
        ? null
        : product.weight.toFixed(2),
    esta_activo: product.isActive,
  };
}
