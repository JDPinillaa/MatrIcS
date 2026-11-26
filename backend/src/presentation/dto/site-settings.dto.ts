import { applyDecorators } from '@nestjs/common';
import { IsInt, IsNumber, Matches, Max, Min } from 'class-validator';

// Topes razonables para no desbordar en la BD.
const MAX_TARIFF = 99_999_999;
const MAX_CAPACITY = 1_000_000;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const TariffValue = () =>
  applyDecorators(
    IsNumber(
      { maxDecimalPlaces: 2 },
      { message: '$property debe ser un número con máximo 2 decimales' },
    ),
    Min(0, { message: '$property no puede ser negativa' }),
    Max(MAX_TARIFF, { message: `$property no puede superar ${MAX_TARIFF}` }),
  );

const CapacityValue = () =>
  applyDecorators(
    IsInt({ message: '$property debe ser un número entero' }),
    Min(0, { message: '$property no puede ser negativo' }),
    Max(MAX_CAPACITY, { message: `$property no puede superar ${MAX_CAPACITY}` }),
  );

const TimeValue = () =>
  applyDecorators(
    Matches(TIME_PATTERN, {
      message: '$property debe tener el formato HH:MM o HH:MM:SS',
    }),
  );

export class ActualizarTarifasDto {
  @TariffValue()
  carroDiurna!: number;

  @TariffValue()
  carroNocturna!: number;

  @TariffValue()
  motoDiurna!: number;

  @TariffValue()
  motoNocturna!: number;
}

export class ActualizarFranjasDto {
  @TimeValue()
  diurnaInicio!: string;

  @TimeValue()
  diurnaFin!: string;

  @TimeValue()
  nocturnaInicio!: string;

  @TimeValue()
  nocturnaFin!: string;
}

export class ActualizarCuposDto {
  @CapacityValue()
  capacidadCarros!: number;

  @CapacityValue()
  capacidadMotos!: number;
}