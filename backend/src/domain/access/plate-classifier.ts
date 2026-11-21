import { BusinessValidationException } from '../exceptions/business-validation.exception';
import type { VehicleType } from './access.types';

/**
 * Estrategia de clasificación por formato de placa (Patrón Strategy / Principio OCP).
 * Agregar un nuevo tipo de vehículo solo requiere registrar una nueva regla sin modificar el clasificador.
 */
export interface IVehicleClassificationRule {
  readonly vehicleType: VehicleType;
  matches(normalizedPlate: string): boolean;
}

/** Formato colombiano para carros particulares/públicos: 3 letras + 3 números (ej. ABC123). */
export class CarPlateRule implements IVehicleClassificationRule {
  public readonly vehicleType: VehicleType = 'CARRO';
  private static readonly PATTERN = /^[A-Z]{3}[0-9]{3}$/;

  matches(normalizedPlate: string): boolean {
    return CarPlateRule.PATTERN.test(normalizedPlate);
  }
}

/**
 * Formato colombiano para motocicletas:
 * - Estándar actual: 3 letras + 2 números + 1 letra (ej. ABC12A).
 * - Formato antiguo: 3 letras + 2 números (ej. ABC12).
 */
export class MotoPlateRule implements IVehicleClassificationRule {
  public readonly vehicleType: VehicleType = 'MOTO';
  private static readonly PATTERN = /^[A-Z]{3}[0-9]{2}[A-Z]?$/;

  matches(normalizedPlate: string): boolean {
    return MotoPlateRule.PATTERN.test(normalizedPlate);
  }
}

export const DEFAULT_VEHICLE_CLASSIFICATION_RULES: readonly IVehicleClassificationRule[] =
  [new CarPlateRule(), new MotoPlateRule()];

export interface PlateClassificationResult {
  placa: string;
  tipoVehiculo: VehicleType;
}

/**
 * Normaliza y clasifica placas colombianas delegando en reglas extensibles (Strategy + SRP + OCP).
 */
export class PlateClassifier {
  constructor(
    private readonly rules: readonly IVehicleClassificationRule[] = DEFAULT_VEHICLE_CLASSIFICATION_RULES,
  ) {}

  classify(rawPlate: string): PlateClassificationResult {
    const normalized = rawPlate.trim().toUpperCase();

    for (const rule of this.rules) {
      if (rule.matches(normalized)) {
        return {
          placa: normalized,
          tipoVehiculo: rule.vehicleType,
        };
      }
    }

    throw new BusinessValidationException(
      `Formato de placa inválido ("${normalized || rawPlate}"). Use AAA123 para carro o AAA12A / AAA12 para moto.`,
      'INVALID_PLATE_FORMAT',
    );
  }
}
