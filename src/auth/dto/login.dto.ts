import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsNotEmpty({ message: 'El campo correo es obligatorio.' })
  @IsEmail({}, { message: 'El campo correo debe ser una dirección válida.' })
  @MaxLength(255, {
    message: 'El campo correo no debe exceder los 255 caracteres.',
  })
  email: string;

  @ApiProperty({ example: 'password' })
  @IsNotEmpty({ message: 'El campo contraseña es obligatorio.' })
  @IsString({ message: 'El campo contraseña debe ser una cadena de texto.' })
  password: string;
}
