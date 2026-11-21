import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GetProfileUseCase } from './application/use-cases/auth/get-profile.use-case';
import { LoginUseCase } from './application/use-cases/auth/login.use-case';
import { CLOCK_PORT } from './domain/ports/clock.port';
import { TOKEN_SERVICE_PORT } from './domain/ports/token-service.port';
import { USUARIO_REPOSITORY_PORT } from './domain/ports/usuario.repository.port';
import { HmacJwtTokenAdapter } from './infrastructure/adapters/hmac-jwt-token.adapter';
import { SystemClockAdapter } from './infrastructure/adapters/system-clock.adapter';
import { PostgresUsuarioRepository } from './infrastructure/database/repositories/postgres-usuario.repository';
import { JwtAuthGuard } from './presentation/auth/jwt-auth.guard';
import { RolesGuard } from './presentation/auth/roles.guard';
import { AuthController } from './presentation/controllers/auth.controller';

/**
 * Módulo de autenticación y control de acceso por roles (HU-01).
 * Registra los guardias de forma global: primero autenticación (401) y luego rol (403).
 */
@Module({
  controllers: [AuthController],
  providers: [
    { provide: CLOCK_PORT, useClass: SystemClockAdapter },
    { provide: TOKEN_SERVICE_PORT, useClass: HmacJwtTokenAdapter },
    { provide: USUARIO_REPOSITORY_PORT, useClass: PostgresUsuarioRepository },
    LoginUseCase,
    GetProfileUseCase,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
