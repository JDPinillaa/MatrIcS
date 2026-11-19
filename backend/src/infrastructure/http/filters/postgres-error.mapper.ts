import { HttpStatus } from '@nestjs/common';

export interface MappedDatabaseError {
  statusCode: number;
  code: string;
  message: string;
}

interface PostgresLikeError {
  code: string;
  constraint?: string;
}

interface ErrorDescriptor {
  code: string;
  message: string;
}

const UNIQUE_CONSTRAINT_MAP: Record<string, ErrorDescriptor> = {
  uq_cobros_placa_sede_dia: {
    code: 'DUPLICATE_DAILY_CHARGE',
    message:
      'Ya existe un cobro registrado para esa placa, sede y día operativo',
  },
  uq_cobros_evento_ingreso: {
    code: 'DUPLICATE_ENTRY_CHARGE',
    message: 'El evento de ingreso ya tiene un cobro asociado',
  },
  uq_pagos_cobro: {
    code: 'CHARGE_ALREADY_PAID',
    message: 'El cobro indicado ya registra un pago',
  },
  uq_pagos_llave_idempotencia: {
    code: 'DUPLICATE_IDEMPOTENCY_KEY',
    message:
      'Ya existe un pago procesado con la misma llave de idempotencia',
  },
  uq_usuarios_email: {
    code: 'DUPLICATE_USER_EMAIL',
    message: 'Ya existe un usuario registrado con ese correo electrónico',
  },
  uq_sedes_nombre: {
    code: 'DUPLICATE_SITE_NAME',
    message: 'Ya existe una sede con ese nombre',
  },
  uq_franjas_sede_nombre: {
    code: 'DUPLICATE_TIME_BAND',
    message: 'Ya existe una franja horaria con ese nombre en la sede',
  },
  uq_tarifas_franja_tipo: {
    code: 'DUPLICATE_TARIFF',
    message:
      'Ya existe una tarifa configurada para esa franja y tipo de vehículo',
  },
  uq_cupos_sede_tipo: {
    code: 'DUPLICATE_CAPACITY_CONFIG',
    message:
      'Ya existe una configuración de cupos para esa sede y tipo de vehículo',
  },
};

const CHECK_CONSTRAINT_MAP: Record<string, ErrorDescriptor> = {
  ck_eventos_placa_formato: {
    code: 'INVALID_PLATE_FORMAT',
    message:
      'El formato de la placa no cumple con el estándar colombiano válido',
  },
  ck_cobros_placa_formato: {
    code: 'INVALID_PLATE_FORMAT',
    message:
      'El formato de la placa no cumple con el estándar colombiano válido',
  },
  ck_cupos_ocupados: {
    code: 'CAPACITY_LIMIT_EXCEEDED',
    message:
      'La ocupación supera la capacidad máxima configurada o es negativa',
  },
  ck_tarifas_valor: {
    code: 'INVALID_AMOUNT_OR_CAPACITY',
    message: 'El valor de la tarifa no puede ser negativo',
  },
  ck_cupos_capacidad: {
    code: 'INVALID_AMOUNT_OR_CAPACITY',
    message: 'La capacidad de cupos no puede ser negativa',
  },
  ck_cobros_valor: {
    code: 'INVALID_AMOUNT_OR_CAPACITY',
    message: 'El valor del cobro no puede ser negativo',
  },
  ck_pagos_monto: {
    code: 'INVALID_AMOUNT_OR_CAPACITY',
    message: 'El monto del pago debe ser mayor que cero',
  },
  ck_sedes_umbral: {
    code: 'INVALID_CONFIDENCE_RANGE',
    message: 'El umbral de confianza debe estar entre 0 y 100',
  },
  ck_eventos_confianza: {
    code: 'INVALID_CONFIDENCE_RANGE',
    message: 'La confianza de lectura debe estar entre 0 y 100',
  },
};

const DEFAULT_UNIQUE_ERROR: ErrorDescriptor = {
  code: 'UNIQUE_CONSTRAINT_VIOLATION',
  message: 'El registro entra en conflicto con un dato único existente',
};

const DEFAULT_CHECK_ERROR: ErrorDescriptor = {
  code: 'CHECK_CONSTRAINT_VIOLATION',
  message: 'Los datos incumplen una restricción de validación en base de datos',
};

function isPostgresLikeError(exception: unknown): exception is PostgresLikeError {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    typeof (exception as { code?: unknown }).code === 'string'
  );
}

/**
 * Traduce códigos SQLSTATE de PostgreSQL (`pg`) a respuestas HTTP controladas
 * sin exponer detalles internos (`detail`, `table`, `schema`, `query` ni `stack`).
 */
export function mapPostgresError(
  exception: unknown,
): MappedDatabaseError | null {
  if (!isPostgresLikeError(exception)) {
    return null;
  }

  const constraint =
    typeof exception.constraint === 'string' ? exception.constraint : '';

  switch (exception.code) {
    case '23505': {
      const descriptor =
        UNIQUE_CONSTRAINT_MAP[constraint] ?? DEFAULT_UNIQUE_ERROR;
      return { statusCode: HttpStatus.CONFLICT, ...descriptor };
    }
    case '23514': {
      const descriptor =
        CHECK_CONSTRAINT_MAP[constraint] ?? DEFAULT_CHECK_ERROR;
      return { statusCode: HttpStatus.BAD_REQUEST, ...descriptor };
    }
    case '23503':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'INVALID_REFERENCE',
        message: 'La referencia asociada al registro no existe o es inválida',
      };
    case '22P02':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'INVALID_DATA_FORMAT',
        message: 'El formato de alguno de los parámetros enviados es inválido',
      };
    default:
      return null;
  }
}
