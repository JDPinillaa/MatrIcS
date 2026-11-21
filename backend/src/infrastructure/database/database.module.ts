import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION_PORT } from '../../domain/ports/database-connection.port';
import { PostgresConnectionAdapter } from './postgres-connection.adapter';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION_PORT,
      useClass: PostgresConnectionAdapter,
    },
  ],
  exports: [DATABASE_CONNECTION_PORT],
})
export class DatabaseModule {}
