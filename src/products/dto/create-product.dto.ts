import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 1, description: 'FK a categories.id' })
  @IsNotEmpty({ message: 'El campo categoría es obligatorio.' })
  @IsInt({ message: 'La categoría seleccionada no es válida.' })
  category_id: number;

  @ApiProperty({ example: 2, description: 'FK a brands.id' })
  @IsNotEmpty({ message: 'El campo marca es obligatorio.' })
  @IsInt({ message: 'La marca seleccionada no es válida.' })
  brand_id: number;

  @ApiProperty({ example: 1, description: 'FK a units.id' })
  @IsNotEmpty({ message: 'El campo unidad es obligatorio.' })
  @IsInt({ message: 'La unidad seleccionada no es válida.' })
  unit_id: number;

  @ApiProperty({ example: 'Martillo 16oz' })
  @IsNotEmpty({ message: 'El campo nombre es obligatorio.' })
  @IsString({ message: 'El campo nombre debe ser una cadena de texto.' })
  @MaxLength(150, {
    message: 'El campo nombre no debe exceder los 150 caracteres.',
  })
  name: string;

  @ApiPropertyOptional({ example: 'Martillo de acero con mango de fibra' })
  @IsOptional()
  @IsString({ message: 'El campo descripción debe ser una cadena de texto.' })
  @MaxLength(1000, {
    message: 'El campo descripción no debe exceder los 1000 caracteres.',
  })
  description?: string | null;

  @ApiProperty({ example: 12500.0 })
  @IsNotEmpty({ message: 'El campo precio es obligatorio.' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El campo precio debe ser un número.' },
  )
  @Min(0, { message: 'El campo precio debe ser mayor o igual a 0.' })
  @Max(99999999.99, {
    message: 'El campo precio no debe ser mayor a 99999999.99.',
  })
  price: number;

  @ApiProperty({ example: 'SKU-001' })
  @IsNotEmpty({ message: 'El campo SKU es obligatorio.' })
  @IsString({ message: 'El campo SKU debe ser una cadena de texto.' })
  @MaxLength(50, { message: 'El SKU no debe exceder los 50 caracteres.' })
  sku: string;

  @ApiPropertyOptional({ example: '7501000000019' })
  @IsOptional()
  @IsString({
    message: 'El campo código de barras debe ser una cadena de texto.',
  })
  @MaxLength(50, {
    message: 'El código de barras no debe exceder los 50 caracteres.',
  })
  barcode?: string | null;

  @ApiProperty({ example: 45 })
  @IsNotEmpty({ message: 'El campo cantidad de stock es obligatorio.' })
  @IsInt({ message: 'El campo cantidad de stock debe ser un número entero.' })
  @Min(0, {
    message: 'El campo cantidad de stock debe ser mayor o igual a 0.',
  })
  @Max(1000000, {
    message: 'El campo cantidad de stock no debe ser mayor a 1000000.',
  })
  stock_quantity: number;

  @ApiPropertyOptional({ example: 0.13 })
  @IsOptional()
  @IsNumber({}, { message: 'La tasa de impuesto debe ser un número.' })
  @Min(0, { message: 'La tasa de impuesto debe ser mayor o igual a 0.' })
  @Max(100, { message: 'La tasa de impuesto no debe ser mayor a 100.' })
  tax_rate?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt({ message: 'El stock mínimo debe ser un número entero.' })
  @Min(0, { message: 'El stock mínimo debe ser mayor o igual a 0.' })
  @Max(1000000, { message: 'El stock mínimo no debe ser mayor a 1000000.' })
  minimum_stock?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt({ message: 'El stock máximo debe ser un número entero.' })
  @Min(0, { message: 'El stock máximo debe ser mayor o igual a 0.' })
  @Max(1000000, { message: 'El stock máximo no debe ser mayor a 1000000.' })
  maximum_stock?: number;

  @ApiPropertyOptional({ example: 0.45 })
  @IsOptional()
  @IsNumber({}, { message: 'El peso debe ser un número.' })
  @Min(0, { message: 'El peso debe ser mayor o igual a 0.' })
  @Max(100000, { message: 'El peso no debe ser mayor a 100000.' })
  weight?: number;

  @ApiPropertyOptional({ example: 'https://example.com/imagen.jpg' })
  @IsOptional()
  @IsUrl({}, { message: 'La URL de la imagen debe ser una URL válida.' })
  @MaxLength(255, {
    message: 'La URL de la imagen no debe exceder los 255 caracteres.',
  })
  image_url?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'El campo esta activo debe ser verdadero o falso.' })
  is_active?: boolean;
}
