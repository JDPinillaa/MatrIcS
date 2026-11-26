import type {VehicleType} from '../access/access.types';
import { BusinessValidationException} from '../exceptions/business-validation.exception';
import type {TariffsInput} from './site-settings.types';

/**
 * Valida el par de tarifas (diurna, nocturna) de un tipo de vehiculo
*/

export function assertValidTariffPair(
    tipoVehiculo: VehicleType,
    diurna: number,
    nocturna: number,

): void {
    if (
        !Number.isFinite(diurna) ||
        !Number.isFinite(nocturna) ||
        diurna <0 ||
        nocturna <0
    ) {
        throw new BusinessValidationException(`Las tarifas de ${tipoVehiculo} deben ser valores numericos mayores o iguales a 0.`,
            'INVALID_AMOUNT_OR_CAPACITY',
        );
        
    }

    const isExemptMotorcycle = tipoVehiculo === 'MOTO' && diurna === 0 && nocturna === 0;
    if(isExemptMotorcycle){
        return;
    }

    if(nocturna>=diurna){
        throw new BusinessValidationException(`Violación de la regla de negocio RN-02: La tarifa nocturna de ${tipoVehiculo} ($${nocturna}) debe ser estrictamente menor que la diurna ($${diurna}).`,
            'TARIFF_NIGHT_NOT_LOWER',
        );
    }
}

export function assertValidTariffs(input: TariffsInput): void{
    assertValidTariffPair('CARRO', input.carroDiurna, input.carroNocturna);
    assertValidTariffPair('MOTO', input.motoDiurna, input.motoNocturna);
}



