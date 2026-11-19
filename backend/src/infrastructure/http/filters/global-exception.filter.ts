import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import { DomainConflictException } from '../../../domain/exceptions/domain-conflict.exception';
import { DomainNotFoundException } from '../../../domain/exceptions/domain-not-found.exception';
import { mapPostgresError } from './postgres-error.mapper';

export interface StandardizedErrorResponse {
  statusCode: number;
  error: string;
  code: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

const HTTP_ERROR_LABELS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

/**
 * Manejador centralizado de excepciones HTTP y de dominio.
 * Garantiza respuestas JSON consistentes sin exponer trazas internas (stack traces).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const payload = this.buildErrorPayload(exception, request?.url ?? '');
    response.status(payload.statusCode).json(payload);
  }

  private buildErrorPayload(
    exception: unknown,
    path: string,
  ): StandardizedErrorResponse {
    const timestamp = new Date().toISOString();

    if (exception instanceof BusinessValidationException) {
      return this.formatPayload(
        HttpStatus.BAD_REQUEST,
        exception.code,
        exception.message,
        timestamp,
        path,
      );
    }

    if (exception instanceof DomainConflictException) {
      return this.formatPayload(
        HttpStatus.CONFLICT,
        exception.code,
        exception.message,
        timestamp,
        path,
      );
    }

    if (exception instanceof DomainNotFoundException) {
      return this.formatPayload(
        HttpStatus.NOT_FOUND,
        exception.code,
        exception.message,
        timestamp,
        path,
      );
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const rawResponse = exception.getResponse();
      const { message, code } = this.extractHttpDetails(
        rawResponse,
        exception.message,
        statusCode,
      );

      return this.formatPayload(statusCode, code, message, timestamp, path);
    }

    const mappedDbError = mapPostgresError(exception);
    if (mappedDbError) {
      return this.formatPayload(
        mappedDbError.statusCode,
        mappedDbError.code,
        mappedDbError.message,
        timestamp,
        path,
      );
    }

    if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception on ${path}: ${exception.message}`,
        exception.stack,
      );
    }

    return this.formatPayload(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR',
      'Error interno del servidor',
      timestamp,
      path,
    );
  }

  private formatPayload(
    statusCode: number,
    code: string,
    message: string | string[],
    timestamp: string,
    path: string,
  ): StandardizedErrorResponse {
    return {
      statusCode,
      error: HTTP_ERROR_LABELS[statusCode] ?? 'Error',
      code,
      message,
      timestamp,
      path,
    };
  }

  private extractHttpDetails(
    rawResponse: string | object,
    fallbackMessage: string,
    statusCode: number,
  ): { message: string | string[]; code: string } {
    const defaultCode = `HTTP_${statusCode}`;

    if (typeof rawResponse === 'string') {
      return { message: rawResponse, code: defaultCode };
    }

    const body = rawResponse as {
      message?: string | string[];
      code?: string;
    };

    return {
      message: body.message ?? fallbackMessage,
      code: body.code ?? defaultCode,
    };
  }
}
