import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'email debe ser un correo electrónico válido' })
  @MaxLength(120, { message: 'email no puede superar 120 caracteres' })
  email!: string;

  @IsString({ message: 'password debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'password es obligatoria' })
  @MaxLength(72, { message: 'password no puede superar 72 caracteres' })
  password!: string;
}
