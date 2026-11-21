import { ConfigService } from '@nestjs/config';
import type { IClock } from '../../domain/ports/clock.port';
import { HmacJwtTokenAdapter } from './hmac-jwt-token.adapter';

describe('HmacJwtTokenAdapter (HU-01)', () => {
  const secret = 'clave-de-pruebas-con-mas-de-32-caracteres-123456';
  const payload = { sub: 2, email: 'operador@parqueadero.local', rol: 'OPERADOR' as const };

  function buildAdapter(
    now: Date,
    env: Record<string, string> = { JWT_SECRET: secret, JWT_EXPIRES_IN: '3600' },
  ) {
    const clock: IClock = { now: () => now };
    return new HmacJwtTokenAdapter(new ConfigService(env), clock);
  }

  const issuedAt = new Date('2026-11-21T15:00:00.000Z');

  it('firma un JWT de 3 partes y lo valida recuperando el payload', () => {
    const adapter = buildAdapter(issuedAt);
    const token = adapter.sign(payload);

    expect(token.split('.')).toHaveLength(3);
    expect(adapter.verify(token)).toEqual(payload);
  });

  it('rechaza un token expirado', () => {
    const token = buildAdapter(issuedAt).sign(payload);
    const unaHoraDespues = new Date(issuedAt.getTime() + 3600 * 1000);

    expect(buildAdapter(unaHoraDespues).verify(token)).toBeNull();
  });

  it('rechaza un token cuyo contenido fue alterado (p. ej. cambiar el rol)', () => {
    const adapter = buildAdapter(issuedAt);
    const [header, claims, signature] = adapter.sign(payload).split('.');
    const alterado = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(claims, 'base64url').toString('utf8')),
        rol: 'ADMINISTRADOR',
      }),
    ).toString('base64url');

    expect(adapter.verify(`${header}.${alterado}.${signature}`)).toBeNull();
  });

  it('rechaza un token firmado con otra clave', () => {
    const otraClave = buildAdapter(issuedAt, {
      JWT_SECRET: 'otra-clave-distinta-con-mas-de-32-caracteres-999',
    });

    expect(buildAdapter(issuedAt).verify(otraClave.sign(payload))).toBeNull();
  });

  it('rechaza textos que no son JWT', () => {
    const adapter = buildAdapter(issuedAt);

    expect(adapter.verify('no-es-un-token')).toBeNull();
    expect(adapter.verify('a.b.c')).toBeNull();
  });

  it('exige JWT_SECRET en producción', () => {
    // ConfigService prioriza process.env, y Jest define NODE_ENV=test.
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => buildAdapter(issuedAt, {})).toThrow(/JWT_SECRET/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
