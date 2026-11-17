import { CheckHealthUseCase } from './check-health.use-case';
import type { IDatabaseConnection } from '../../../domain/ports/database-connection.port';

describe('CheckHealthUseCase', () => {
  it('debe retornar database "connected" cuando la conexión a PostgreSQL responde', async () => {
    const mockDb: IDatabaseConnection = {
      query: jest.fn(),
      checkConnection: jest.fn().mockResolvedValue(true),
    };

    const useCase = new CheckHealthUseCase(mockDb);
    const result = await useCase.execute();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('matrics-backend');
    expect(result.database).toBe('connected');
    expect(Date.parse(result.timestamp)).not.toBeNaN();
  });

  it('debe retornar database "disconnected" sin fallar cuando la BD no responde', async () => {
    const mockDb: IDatabaseConnection = {
      query: jest.fn(),
      checkConnection: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };

    const useCase = new CheckHealthUseCase(mockDb);
    const result = await useCase.execute();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('disconnected');
  });
});
