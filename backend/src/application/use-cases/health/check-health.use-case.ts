import { Inject, Injectable } from '@nestjs/common';
import {
  DATABASE_CONNECTION_PORT,
  type IDatabaseConnection,
} from '../../../domain/ports/database-connection.port';

export interface HealthStatusResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  database: 'connected' | 'disconnected';
}

/**
 * Caso de uso para verificar la disponibilidad del servicio backend
 * y el estado de conectividad hacia la base de datos.
 */
@Injectable()
export class CheckHealthUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION_PORT)
    private readonly dbConnection: IDatabaseConnection,
  ) {}

  async execute(): Promise<HealthStatusResponse> {
    let isConnected = false;
    try {
      isConnected = await this.dbConnection.checkConnection();
    } catch {
      isConnected = false;
    }

    return {
      status: 'ok',
      service: 'matrics-backend',
      timestamp: new Date().toISOString(),
      database: isConnected ? 'connected' : 'disconnected',
    };
  }
}
