import { Injectable } from '@nestjs/common';
import type { CobroSummary } from '../../domain/access/access.types';
import type {
  GenerateBillingInput,
  IBillingGeneratorPort,
} from '../../domain/ports/billing-generator.port';

/**
 * Adaptador nulo por defecto hasta conectar el motor de cobros (HU-05).
 * Permite operar y probar HU-03 de punta a punta manteniendo bajo acoplamiento.
 */
@Injectable()
export class NoopBillingGeneratorAdapter implements IBillingGeneratorPort {
  async generateOnEntry(_input: GenerateBillingInput): Promise<CobroSummary | null> {
    return null;
  }
}
