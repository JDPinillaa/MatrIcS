import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import type {
  AccessEventType,
  ChargeStatus,
} from '../../domain/access/access.types';

export class ListarEventosQueryDto {
  @IsOptional()
  @IsString({ message: 'placa debe ser una cadena de texto' })
  placa?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener el formato YYYY-MM-DD',
  })
  fecha?: string;

  @IsOptional()
  @IsIn(['ENTRADA', 'SALIDA'], {
    message: 'tipoEvento debe ser ENTRADA o SALIDA',
  })
  tipoEvento?: AccessEventType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'lecturaManual debe ser un valor booleano' })
  lecturaManual?: boolean;
}

export class ListarCobrosQueryDto {
  @IsOptional()
  @IsString({ message: 'placa debe ser una cadena de texto' })
  placa?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaDiaOperativo debe tener el formato YYYY-MM-DD',
  })
  fechaDiaOperativo?: string;

  @IsOptional()
  @IsIn(['PENDIENTE', 'PAGADO', 'EXENTO', 'ANULADO'], {
    message: 'estado debe ser PENDIENTE, PAGADO, EXENTO o ANULADO',
  })
  estado?: ChargeStatus;
}
