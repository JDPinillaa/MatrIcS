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
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: HTTP_ERROR_LABELS[HttpStatus.BAD_REQUEST],
        code: exception.code,
        message: exception.message,
        timestamp,
        path,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const rawResponse = exception.getResponse();
      const { message, code } = this.extractHttpDetails(
        rawResponse,
        exception.message,
        statusCode,
      );

      return {
        statusCode,
        error: HTTP_ERROR_LABELS[statusCode] ?? 'Error',
        code,
        message,
        timestamp,
        path,
      };
    }

    if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception on ${path}: ${exception.message}`,
        exception.stack,
      );
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: HTTP_ERROR_LABELS[HttpStatus.INTERNAL_SERVER_ERROR],
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor',
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
