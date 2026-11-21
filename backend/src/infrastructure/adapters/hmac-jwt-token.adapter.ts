import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isUserRole, type TokenPayload } from '../../domain/auth/auth.types';
import { CLOCK_PORT, type IClock } from '../../domain/ports/clock.port';
import type { ITokenService } from '../../domain/ports/token-service.port';

const DEFAULT_EXPIRES_IN_SECONDS = 8 * 60 * 60; // una jornada de 8 horas
const MIN_SECRET_LENGTH = 32;

interface JwtHeader {
  alg?: unknown;
  typ?: unknown;
}

interface JwtClaims {
  sub?: unknown;
  email?: unknown;
  rol?: unknown;
  iat?: unknown;
  exp?: unknown;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function parseJsonSegment<T>(segment: string): T | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    return parsed !== null && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

/**
 * Adaptador de tokens JWT firmados con HMAC-SHA256 (HS256) usando el módulo `crypto` de Node.
 * No requiere dependencias externas. Lee:
 *  - JWT_SECRET: clave de firma (obligatoria en producción, mínimo 32 caracteres).
 *  - JWT_EXPIRES_IN: vigencia del token en segundos (por defecto 8 horas).
 */
@Injectable()
export class HmacJwtTokenAdapter implements ITokenService {
  private readonly logger = new Logger(HmacJwtTokenAdapter.name);
  private readonly secret: string;
  private readonly expiresInSeconds: number;

  constructor(
    configService: ConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {
    this.secret = this.resolveSecret(configService);

    const rawExpiresIn = Number(configService.get<string>('JWT_EXPIRES_IN'));
    this.expiresInSeconds =
      Number.isInteger(rawExpiresIn) && rawExpiresIn > 0
        ? rawExpiresIn
        : DEFAULT_EXPIRES_IN_SECONDS;
  }

  sign(payload: TokenPayload): string {
    const issuedAt = this.nowInSeconds();
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const claims = base64UrlEncode(
      JSON.stringify({
        sub: payload.sub,
        email: payload.email,
        rol: payload.rol,
        iat: issuedAt,
        exp: issuedAt + this.expiresInSeconds,
      }),
    );

    return `${header}.${claims}.${this.signature(`${header}.${claims}`)}`;
  }

  verify(token: string): TokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, claims, signature] = parts;
    const expected = Buffer.from(this.signature(`${header}.${claims}`));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return null;
    }

    const parsedHeader = parseJsonSegment<JwtHeader>(header);
    if (!parsedHeader || parsedHeader.alg !== 'HS256') {
      return null;
    }

    const parsedClaims = parseJsonSegment<JwtClaims>(claims);
    if (!parsedClaims) {
      return null;
    }

    const { sub, email, rol, exp } = parsedClaims;
    if (
      typeof sub !== 'number' ||
      !Number.isInteger(sub) ||
      typeof email !== 'string' ||
      !isUserRole(rol) ||
      typeof exp !== 'number' ||
      exp <= this.nowInSeconds()
    ) {
      return null;
    }

    return { sub, email, rol };
  }

  private signature(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }

  private nowInSeconds(): number {
    return Math.floor(this.clock.now().getTime() / 1000);
  }

  private resolveSecret(configService: ConfigService): string {
    const configured = configService.get<string>('JWT_SECRET')?.trim() ?? '';
    if (configured.length >= MIN_SECRET_LENGTH) {
      return configured;
    }

    if (configService.get<string>('NODE_ENV') === 'production') {
      throw new Error(
        `JWT_SECRET es obligatorio en producción y debe tener al menos ${MIN_SECRET_LENGTH} caracteres`,
      );
    }

    // En desarrollo se usa una clave aleatoria: las sesiones se pierden al reiniciar el servidor.
    this.logger.warn(
      `JWT_SECRET no definido o con menos de ${MIN_SECRET_LENGTH} caracteres; se usa una clave temporal de desarrollo`,
    );
    return randomBytes(48).toString('hex');
  }
}
