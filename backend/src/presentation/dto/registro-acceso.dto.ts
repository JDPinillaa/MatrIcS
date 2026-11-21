import { IsInt, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class RegistroAccesoDto {
  @IsInt({ message: 'sedeId debe ser un número entero positivo' })
  @Min(1, { message: 'sedeId debe ser mayor o igual a 1' })
  sedeId!: number;

  @IsString({ message: 'placa debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'placa es obligatoria' })
  placa!: string;

  @IsNumber({}, { message: 'confianzaLectura debe ser un número válido' })
  @Min(0, { message: 'confianzaLectura debe estar entre 0 y 100' })
  @Max(100, { message: 'confianzaLectura debe estar entre 0 y 100' })
  confianzaLectura!: number;
}
