import { Controller, Get, INestApplication, Param, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GetProfileUseCase } from '../../application/use-cases/auth/get-profile.use-case';
import { LoginUseCase } from '../../application/use-cases/auth/login.use-case';
import { configureApp } from '../../bootstrap';
import type { UsuarioPerfil } from '../../domain/auth/auth.types';
import { CLOCK_PORT } from '../../domain/ports/clock.port';
import { TOKEN_SERVICE_PORT } from '../../domain/ports/token-service.port';
import {
  USUARIO_REPOSITORY_PORT,
  type IUsuarioRepository,
} from '../../domain/ports/usuario.repository.port';
import { HmacJwtTokenAdapter } from '../../infrastructure/adapters/hmac-jwt-token.adapter';
import { Public, Roles } from '../auth/auth.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuthController } from './auth.controller';

/**
 * Controladores de prueba que simulan los permisos definidos en HU-01,
 * independientes de la implementación real de tarifas (HU-02) o carriles (HU-03/HU-07).
 */
@Controller('sedes')
class AdminOnlyTestController {
  @Roles('ADMINISTRADOR')
  @Put(':sedeId/tarifas')
  actualizarTarifas(@Param('sedeId') sedeId: string) {
    return { sedeId: Number(sedeId), actualizado: true };
  }

  @Roles('ADMINISTRADOR', 'OPERADOR')
  @Get(':sedeId/eventos')
  consultarEventos() {
    return [];
  }
}

@Roles('OPERADOR')
@Controller('carril')
class OperatorOnlyTestController {
  @Put('barrera')
  abrirBarrera() {
    return { resultado: 'ABIERTA' };
  }
}

@Controller('publico')
class PublicTestController {
  @Public()
  @Get()
  ping() {
    return { ok: true };
  }
}

describe('Autenticación y control de acceso por roles (HU-01)', () => {
  let app: INestApplication;

  const admin: UsuarioPerfil = {
    id: 1,
    nombreCompleto: 'Administrador del Sistema',
    email: 'admin@parqueadero.local',
    rol: 'ADMINISTRADOR',
    activo: true,
  };
  const operador: UsuarioPerfil = {
    id: 2,
    nombreCompleto: 'Operador de Carril y Caja',
    email: 'operador@parqueadero.local',
    rol: 'OPERADOR',
    activo: true,
  };
  const passwords: Record<string, string> = {
    'admin@parqueadero.local': 'Admin123*',
    'operador@parqueadero.local': 'Operador123*',
  };
  const usuarios = [admin, operador];

  const usuarioRepo: IUsuarioRepository = {
    verifyCredentials: async (email, password) =>
      passwords[email] === password
        ? (usuarios.find((u) => u.email === email) ?? null)
        : null,
    findById: async (id) => usuarios.find((u) => u.id === id) ?? null,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        AdminOnlyTestController,
        OperatorOnlyTestController,
        PublicTestController,
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_SECRET: 'clave-de-pruebas-con-mas-de-32-caracteres-123456',
          }),
        },
        { provide: CLOCK_PORT, useValue: { now: () => new Date() } },
        { provide: TOKEN_SERVICE_PORT, useClass: HmacJwtTokenAdapter },
        { provide: USUARIO_REPOSITORY_PORT, useValue: usuarioRepo },
        LoginUseCase,
        GetProfileUseCase,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginAs(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.accessToken as string;
  }

  describe('POST /auth/login', () => {
    it('responde 200 con token y perfil (sin el hash) ante credenciales válidas', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@parqueadero.local', password: 'Admin123*' })
        .expect(200);

      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.usuario).toEqual(admin);
      expect(JSON.stringify(response.body)).not.toContain('password');
    });

    it('responde 401 ante una contraseña incorrecta', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@parqueadero.local', password: 'Equivocada1*' })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'INVALID_CREDENTIALS',
        path: '/auth/login',
      });
    });

    it('responde 400 si falta la contraseña o el email no es válido', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'no-es-un-correo' })
        .expect(400);
    });
  });

  describe('GET /auth/perfil', () => {
    it('responde 401 sin token', async () => {
      const response = await request(app.getHttpServer()).get('/auth/perfil').expect(401);

      expect(response.body).toMatchObject({ statusCode: 401, error: 'Unauthorized' });
    });

    it('responde 401 con un token inválido', async () => {
      await request(app.getHttpServer())
        .get('/auth/perfil')
        .set('Authorization', 'Bearer token.falso.123')
        .expect(401);
    });

    it('responde 200 con el perfil del usuario en sesión', async () => {
      const token = await loginAs('operador@parqueadero.local', 'Operador123*');

      const response = await request(app.getHttpServer())
        .get('/auth/perfil')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(operador);
    });
  });

  describe('Control de acceso por roles', () => {
    it('Caso de éxito: ADMINISTRADOR inicia sesión y puede administrar tarifas', async () => {
      const token = await loginAs('admin@parqueadero.local', 'Admin123*');

      const response = await request(app.getHttpServer())
        .put('/sedes/1/tarifas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ sedeId: 1, actualizado: true });
    });

    it('Caso de error: OPERADOR que intenta actualizar tarifas recibe 403 Forbidden', async () => {
      const token = await loginAs('operador@parqueadero.local', 'Operador123*');

      const response = await request(app.getHttpServer())
        .put('/sedes/1/tarifas')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        code: 'HTTP_403',
        path: '/sedes/1/tarifas',
      });
    });

    it('sin sesión, un endpoint protegido responde 401 (no 403)', async () => {
      await request(app.getHttpServer()).put('/sedes/1/tarifas').expect(401);
    });

    it('OPERADOR puede operar el carril y ADMINISTRADOR no', async () => {
      const tokenOperador = await loginAs('operador@parqueadero.local', 'Operador123*');
      const tokenAdmin = await loginAs('admin@parqueadero.local', 'Admin123*');

      await request(app.getHttpServer())
        .put('/carril/barrera')
        .set('Authorization', `Bearer ${tokenOperador}`)
        .expect(200);
      await request(app.getHttpServer())
        .put('/carril/barrera')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(403);
    });

    it('ambos roles pueden consultar eventos', async () => {
      for (const [email, password] of Object.entries(passwords)) {
        const token = await loginAs(email, password);
        await request(app.getHttpServer())
          .get('/sedes/1/eventos')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      }
    });

    it('los endpoints marcados como @Public() no exigen sesión', async () => {
      await request(app.getHttpServer()).get('/publico').expect(200);
    });
  });
});
