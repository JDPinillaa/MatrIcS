import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccessModule } from './access.module';
import { AuthModule } from './auth.module';
import { CheckHealthUseCase } from './application/use-cases/health/check-health.use-case';
import { DatabaseModule } from './infrastructure/database/database.module';
import { LprModule } from './lpr.module';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    AuthModule,
    AccessModule,
    LprModule,
  ],
  controllers: [HealthController],
  providers: [CheckHealthUseCase],
})
export class AppModule {}
