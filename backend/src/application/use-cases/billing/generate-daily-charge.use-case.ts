import { Inject, Injectable } from '@nestjs/common';
import type { CobroSummary } from '../../../domain/access/access.types';
import { calculateOperationalDay } from '../../../domain/access/operational-day.calculator';
import { resolveTimeBand } from '../../../domain/billing/time-band.resolver';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import { DomainConflictException } from '../../../domain/exceptions/domain-conflict.exception';
import type {
  GenerateBillingInput,
  IBillingGeneratorPort,
} from '../../../domain/ports/billing-generator.port';
import {
  COBRO_CONSULTA_REPOSITORY_PORT,
  type ICobroConsultaRepository,
} from '../../../domain/ports/cobro-consulta.repository.port';
import {
  COBRO_REPOSITORY_PORT,
  type ICobroRepository,
} from '../../../domain/ports/cobro.repository.port';
import {
  TARIFA_REPOSITORY_PORT,
  type ITarifaRepository,
} from '../../../domain/ports/tarifa.repository.port';

/**
 * Motor de generación de cobro por día operativo (HU-05).
 * Implementa el puerto que el ingreso (HU-03) invoca después de registrar la ENTRADA.
 *
 * 1. Calcula el día operativo del ingreso (06:00 a 05:59, S-02).
 * 2. Si la placa ya tiene cobro en (placa, sede, día operativo), lo reutiliza: no crea otro.
 * 3. Identifica la franja del ingreso y su tarifa vigente para el tipo de vehículo.
 * 4. Crea el cobro copiando franja y valor (RN-07). Valor $0 (p. ej. MOTO, RN-01) → EXENTO;
 *    en otro caso → PENDIENTE.
 * 5. Si otra petición simultánea creó el cobro primero, la base de datos rechaza el duplicado
 *    y se retorna el cobro existente.
 */
@Injectable()
export class GenerateDailyChargeUseCase implements IBillingGeneratorPort {
  constructor(
    @Inject(TARIFA_REPOSITORY_PORT)
    private readonly tarifaRepository: ITarifaRepository,
    @Inject(COBRO_REPOSITORY_PORT)
    private readonly cobroRepository: ICobroRepository,
    @Inject(COBRO_CONSULTA_REPOSITORY_PORT)
    private readonly cobroConsultaRepository: ICobroConsultaRepository,
  ) {}

  async generateOnEntry(
    input: GenerateBillingInput,
  ): Promise<CobroSummary | null> {
    const fechaDiaOperativo = calculateOperationalDay(input.fechaHora);

    const existing = await this.findExisting(input, fechaDiaOperativo);
    if (existing) {
      return existing;
    }

    const tarifas = await this.tarifaRepository.findBySedeAndVehicleType(
      input.sedeId,
      input.tipoVehiculo,
    );
    const tarifa = resolveTimeBand(input.fechaHora, tarifas);
    if (!tarifa) {
      throw new BusinessValidationException(
        `No hay una tarifa configurada para ${input.tipoVehiculo} en la franja del ingreso.`,
        'TARIFF_NOT_CONFIGURED',
      );
    }

    try {
      return await this.cobroRepository.create({
        sedeId: input.sedeId,
        eventoIngresoId: input.eventoIngresoId,
        placa: input.placa,
        tipoVehiculo: input.tipoVehiculo,
        fechaDiaOperativo,
        franjaAplicada: tarifa.franja,
        valorAplicado: tarifa.valor,
        estado: tarifa.valor === 0 ? 'EXENTO' : 'PENDIENTE',
        generadoEn: input.fechaHora,
      });
    } catch (error) {
      if (
        error instanceof DomainConflictException &&
        error.code === 'DUPLICATE_DAILY_CHARGE'
      ) {
        const concurrent = await this.findExisting(input, fechaDiaOperativo);
        if (concurrent) {
          return concurrent;
        }
      }
      throw error;
    }
  }

  private findExisting(
    input: GenerateBillingInput,
    fechaDiaOperativo: string,
  ): Promise<CobroSummary | null> {
    return this.cobroConsultaRepository.findByPlateSedeAndOperationalDay(
      input.placa,
      input.sedeId,
      fechaDiaOperativo,
    );
  }
}
