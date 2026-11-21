import { Injectable } from '@nestjs/common';
import type { CobroSummary } from '../../domain/access/access.types';
import type {
  GenerateBillingInput,
  IBillingGeneratorPort,
} from '../../domain/ports/billing-generator.port';

/**
 * Adaptador nulo que no genera cobros. El módulo usa el motor real
 * (GenerateDailyChargeUseCase, HU-05); este se conserva para pruebas de HU-03/HU-07
 * que no necesitan cobro y para aislar el flujo de ingreso.
 */
@Injectable()
export class NoopBillingGeneratorAdapter implements IBillingGeneratorPort {
  async generateOnEntry(_input: GenerateBillingInput): Promise<CobroSummary | null> {
    return null;
  }
}
