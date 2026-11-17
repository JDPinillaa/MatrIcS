import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CheckHealthUseCase } from './application/use-cases/health/check-health.use-case';
import { DATABASE_CONNECTION_PORT } from './domain/ports/database-connection.port';
import { PostgresConnectionAdapter } from './infrastructure/database/postgres-connection.adapter';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
  ],
  controllers: [HealthController],
  providers: [
    CheckHealthUseCase,
    {
      provide: DATABASE_CONNECTION_PORT,
      useClass: PostgresConnectionAdapter,
    },
  ],
  exports: [DATABASE_CONNECTION_PORT],
})
export class AppModule {}
