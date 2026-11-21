import { Module } from '@nestjs/common';
import { RegisterEntryUseCase } from './application/use-cases/access/register-entry.use-case';
import { RegisterExitUseCase } from './application/use-cases/access/register-exit.use-case';
import { GenerateDailyChargeUseCase } from './application/use-cases/billing/generate-daily-charge.use-case';
import { PlateClassifier } from './domain/access/plate-classifier';
import { BILLING_GENERATOR_PORT } from './domain/ports/billing-generator.port';
import { CLOCK_PORT } from './domain/ports/clock.port';
import { COBRO_CONSULTA_REPOSITORY_PORT } from './domain/ports/cobro-consulta.repository.port';
import { COBRO_REPOSITORY_PORT } from './domain/ports/cobro.repository.port';
import { CUPO_REPOSITORY_PORT } from './domain/ports/cupo.repository.port';
import { EVENTO_ACCESO_REPOSITORY_PORT } from './domain/ports/evento-acceso.repository.port';
import { LPR_READER_PORT } from './domain/ports/lpr-reader.port';
import { SEDE_CONFIG_REPOSITORY_PORT } from './domain/ports/sede-config.repository.port';
import { TARIFA_REPOSITORY_PORT } from './domain/ports/tarifa.repository.port';
import { SimulatedLprAdapter } from './infrastructure/adapters/simulated-lpr.adapter';
import { SystemClockAdapter } from './infrastructure/adapters/system-clock.adapter';
import { PostgresCobroConsultaRepository } from './infrastructure/database/repositories/postgres-cobro-consulta.repository';
import { PostgresCobroRepository } from './infrastructure/database/repositories/postgres-cobro.repository';
import { PostgresCupoRepository } from './infrastructure/database/repositories/postgres-cupo.repository';
import { PostgresEventoAccesoRepository } from './infrastructure/database/repositories/postgres-evento-acceso.repository';
import { PostgresSedeConfigRepository } from './infrastructure/database/repositories/postgres-sede-config.repository';
import { PostgresTarifaRepository } from './infrastructure/database/repositories/postgres-tarifa.repository';
import { AccessController } from './presentation/controllers/access.controller';

@Module({
  controllers: [AccessController],
  providers: [
    {
      provide: PlateClassifier,
      useFactory: () => new PlateClassifier(),
    },
    {
      provide: LPR_READER_PORT,
      useClass: SimulatedLprAdapter,
    },
    {
      provide: CLOCK_PORT,
      useClass: SystemClockAdapter,
    },
    {
      // Motor de cobro por día operativo (HU-05).
      provide: BILLING_GENERATOR_PORT,
      useClass: GenerateDailyChargeUseCase,
    },
    {
      provide: TARIFA_REPOSITORY_PORT,
      useClass: PostgresTarifaRepository,
    },
    {
      provide: COBRO_REPOSITORY_PORT,
      useClass: PostgresCobroRepository,
    },
    {
      provide: SEDE_CONFIG_REPOSITORY_PORT,
      useClass: PostgresSedeConfigRepository,
    },
    {
      provide: CUPO_REPOSITORY_PORT,
      useClass: PostgresCupoRepository,
    },
    {
      provide: EVENTO_ACCESO_REPOSITORY_PORT,
      useClass: PostgresEventoAccesoRepository,
    },
    {
      provide: COBRO_CONSULTA_REPOSITORY_PORT,
      useClass: PostgresCobroConsultaRepository,
    },
    RegisterEntryUseCase,
    RegisterExitUseCase,
  ],
  exports: [
    PlateClassifier,
    LPR_READER_PORT,
    CLOCK_PORT,
    SEDE_CONFIG_REPOSITORY_PORT,
    CUPO_REPOSITORY_PORT,
    EVENTO_ACCESO_REPOSITORY_PORT,
    COBRO_CONSULTA_REPOSITORY_PORT,
  ],
})
export class AccessModule {}
