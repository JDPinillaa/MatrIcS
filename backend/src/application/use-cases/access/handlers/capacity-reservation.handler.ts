import { DomainNotFoundException } from '../../../../domain/exceptions/domain-not-found.exception';
import type { ICupoRepository } from '../../../../domain/ports/cupo.repository.port';
import {
  AbstractEntryValidationHandler,
  type EntryBlockedOutcome,
  type EntryValidationContext,
} from './entry-validation.handler';

/**
 * Eslabón 2 (HU-03 / F-07): verifica disponibilidad de cupo por tipo de vehículo
 * y reserva 1 cupo de forma atómica. Si el cupo disponible es 0, responde "LLENO".
 */
export class CapacityReservationHandler extends AbstractEntryValidationHandler {
  constructor(private readonly cupoRepository: ICupoRepository) {
    super();
  }

  async handle(
    context: EntryValidationContext,
  ): Promise<EntryBlockedOutcome | null> {
    const currentCapacity = await this.cupoRepository.findBySedeAndVehicleType(
      context.sede.id,
      context.tipoVehiculo,
    );

    if (!currentCapacity) {
      throw new DomainNotFoundException(
        `No existe configuración de cupos para ${context.tipoVehiculo} en ${context.sede.nombre}.`,
        'CAPACITY_CONFIG_NOT_FOUND',
      );
    }

    if (currentCapacity.ocupados >= currentCapacity.capacidadMaxima) {
      return {
        allowed: false,
        requiereValidacionManual: false,
        resultadoBarrera: 'LLENO',
        motivo: `LLENO: No hay cupos disponibles para ${context.tipoVehiculo} en ${context.sede.nombre}.`,
      };
    }

    const reserved = await this.cupoRepository.reserveSpot(
      context.sede.id,
      context.tipoVehiculo,
    );

    if (!reserved) {
      return {
        allowed: false,
        requiereValidacionManual: false,
        resultadoBarrera: 'LLENO',
        motivo: `LLENO: No hay cupos disponibles para ${context.tipoVehiculo} en ${context.sede.nombre}.`,
      };
    }

    context.reservedCupo = reserved;
    return super.handle(context);
  }
}
