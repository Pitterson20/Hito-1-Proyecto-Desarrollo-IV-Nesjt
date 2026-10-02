import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * Equivalente a `UpdateProductRequest` (`sometimes` en todos los campos).
 * La verificación de unicidad ignora el propio registro.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
