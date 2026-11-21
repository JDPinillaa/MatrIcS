import type { SedeConfig } from '../access/access.types';

export const SEDE_CONFIG_REPOSITORY_PORT = Symbol('SEDE_CONFIG_REPOSITORY_PORT');

/**
 * Puerto segregado para consultar configuración operativa básica de la sede (ISP + DIP).
 */
export interface ISedeConfigRepository {
  findActiveById(sedeId: number): Promise<SedeConfig | null>;
  updateConfidenceThreshold?(
    sedeId: number,
    umbralConfianza: number,
  ): Promise<SedeConfig | null>;
}
