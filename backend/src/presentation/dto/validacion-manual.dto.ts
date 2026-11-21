import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { AccessEventType } from '../../domain/access/access.types';
import type { ManualValidationAction } from '../../application/use-cases/access/validate-manual-access.use-case';

export class ValidacionManualDto {
  @IsInt({ message: 'sedeId debe ser un número entero positivo' })
  @Min(1, { message: 'sedeId debe ser mayor o igual a 1' })
  sedeId!: number;

  @IsIn(['ENTRADA', 'SALIDA'], {
    message: 'tipoEvento debe ser ENTRADA o SALIDA',
  })
  tipoEvento!: AccessEventType;

  @IsIn(['CONFIRMAR', 'DESCARTAR'], {
    message: 'accion debe ser CONFIRMAR o DESCARTAR',
  })
  accion!: ManualValidationAction;

  @IsOptional()
  @IsString({ message: 'placaCorregida debe ser una cadena de texto' })
  placaCorregida?: string;

  @IsOptional()
  @IsNumber({}, { message: 'confianzaOriginal debe ser un número válido' })
  @Min(0, { message: 'confianzaOriginal debe estar entre 0 y 100' })
  @Max(100, { message: 'confianzaOriginal debe estar entre 0 y 100' })
  confianzaOriginal?: number;

  @IsOptional()
  @IsInt({ message: 'usuarioId debe ser un número entero positivo' })
  @Min(1, { message: 'usuarioId debe ser mayor o igual a 1' })
  usuarioId?: number;
}

export class ActualizarUmbralConfianzaDto {
  @IsNumber({}, { message: 'umbralConfianza debe ser un número válido' })
  @Min(0, { message: 'umbralConfianza debe estar entre 0 y 100' })
  @Max(100, { message: 'umbralConfianza debe estar entre 0 y 100' })
  umbralConfianza!: number;
}
