import type {VehicleType} from '../access/access.types';
import {BusinessValidationException} from '../exceptions/business-validation.exception';

/**
 * La capacidad deber ser un entero positivo >=0 y no puede quedar por debajo de los cupos
 * ocupados en este momento
*/


export function assertValidCapacity(
    tipoVehiculo: VehicleType,
    capacidad: number,
    ocupados: number,

): void {
    if(!Number.isInteger(capacidad)|| capacidad<0){
        throw new BusinessValidationException(`La capacidad de ${tipoVehiculo} debe ser un numero entero mayor o igual a 0`,
        'INVALID_AMOUNT_OR_CAPACITY',
        );
    }

    if (capacidad<ocupados){
        throw new BusinessValidationException(`La capacidad de ${tipoVehiculo} (${capacidad}) no puede ser menor que los cupos ocupados actualmente (${ocupados})`,
            'CAPACITY_BELOW_OCCUPIED',   
        );
    }
}