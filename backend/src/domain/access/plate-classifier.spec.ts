import { BusinessValidationException } from '../exceptions/business-validation.exception';
import {
  PlateClassifier,
  type IVehicleClassificationRule,
} from './plate-classifier';

describe('PlateClassifier (Strategy + OCP)', () => {
  const classifier = new PlateClassifier();

  it('clasifica formato AAA123 como CARRO y normaliza espacios/minúsculas', () => {
    expect(classifier.classify('  abc123 ')).toEqual({
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
    });
  });

  it('clasifica formato estándar AAA12A como MOTO', () => {
    expect(classifier.classify('xyz45d')).toEqual({
      placa: 'XYZ45D',
      tipoVehiculo: 'MOTO',
    });
  });

  it('clasifica formato antiguo colombiano AAA12 (5 caracteres) como MOTO', () => {
    expect(classifier.classify('mnp78')).toEqual({
      placa: 'MNP78',
      tipoVehiculo: 'MOTO',
    });
  });

  it.each(['', '   ', 'AB12', '123ABC', 'ABCD12', 'ABC1234', 'ABC123A', 'AB-123'])(
    'rechaza el formato inválido %p lanzando BusinessValidationException',
    (invalidPlate) => {
      expect(() => classifier.classify(invalidPlate)).toThrow(
        BusinessValidationException,
      );

      try {
        classifier.classify(invalidPlate);
      } catch (error) {
        expect((error as BusinessValidationException).code).toBe(
          'INVALID_PLATE_FORMAT',
        );
      }
    },
  );

  it('permite extender reglas sin modificar PlateClassifier (OCP)', () => {
    const customRule: IVehicleClassificationRule = {
      vehicleType: 'CARRO',
      matches: (plate) => /^CD[0-9]{4}$/.test(plate),
    };
    const extensibleClassifier = new PlateClassifier([customRule]);

    expect(extensibleClassifier.classify('cd1234')).toEqual({
      placa: 'CD1234',
      tipoVehiculo: 'CARRO',
    });
  });
});
