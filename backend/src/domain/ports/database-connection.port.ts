export const DATABASE_CONNECTION_PORT = Symbol('DATABASE_CONNECTION_PORT');

/**
 * Puerto de conexión a base de datos para desacoplar casos de uso
 * del motor o librería concreta (Principio de Inversión de Dependencias).
 */
export interface IDatabaseConnection {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  checkConnection(): Promise<boolean>;
}
