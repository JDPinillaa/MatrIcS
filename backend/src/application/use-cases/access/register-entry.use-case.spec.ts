import type {
  CupoSnapshot,
  EventoAccesoRecord,
  SedeConfig,
} from '../../../domain/access/access.types';
import { PlateClassifier } from '../../../domain/access/plate-classifier';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import { DomainNotFoundException } from '../../../domain/exceptions/domain-not-found.exception';
import type { IBillingGeneratorPort } from '../../../domain/ports/billing-generator.port';
import type { IClock } from '../../../domain/ports/clock.port';
import type { ICupoRepository } from '../../../domain/ports/cupo.repository.port';
import type { IEventoAccesoRepository } from '../../../domain/ports/evento-acceso.repository.port';
import type { ILprReader } from '../../../domain/ports/lpr-reader.port';
import type { ISedeConfigRepository } from '../../../domain/ports/sede-config.repository.port';
import { RegisterEntryUseCase } from './register-entry.use-case';

describe('RegisterEntryUseCase (HU-03)', () => {
  const activeSede: SedeConfig = {
    id: 1,
    nombre: 'Sede Principal',
    umbralConfianza: 80,
    activa: true,
  };

  const fixedDate = new Date('2026-11-21T14:30:00.000Z');

  function buildUseCase() {
    const lprReader: jest.Mocked<ILprReader> = {
      readPlate: jest.fn(async ({ placa, confianzaLectura }) => ({
        placa: placa.trim().toUpperCase(),
        confianza: confianzaLectura,
      })),
    };

    const sedeRepo: jest.Mocked<ISedeConfigRepository> = {
      findActiveById: jest.fn().mockResolvedValue(activeSede),
    };

    const cupoRepo: jest.Mocked<ICupoRepository> = {
      findBySedeAndVehicleType: jest.fn(),
      reserveSpot: jest.fn(),
      releaseSpot: jest.fn(),
    };

    const eventoRepo: jest.Mocked<IEventoAccesoRepository> = {
      create: jest.fn(),
    };

    const billingGenerator: jest.Mocked<IBillingGeneratorPort> = {
      generateOnEntry: jest.fn().mockResolvedValue(null),
    };

    const clock: IClock = {
      now: () => fixedDate,
    };

    const useCase = new RegisterEntryUseCase(
      lprReader,
      sedeRepo,
      cupoRepo,
      eventoRepo,
      billingGenerator,
      clock,
      new PlateClassifier(),
    );

    return {
      useCase,
      lprReader,
      sedeRepo,
      cupoRepo,
      eventoRepo,
      billingGenerator,
    };
  }

  it('clasifica CARRO (ABC123), descuenta 1 cupo, guarda evento y abre barrera', async () => {
    const { useCase, cupoRepo, eventoRepo, billingGenerator } = buildUseCase();

    const available: CupoSnapshot = {
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 10,
    };
    const reserved: CupoSnapshot = { ...available, ocupados: 11 };
    const savedEvent: EventoAccesoRecord = {
      id: 101,
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      usuarioId: null,
      placa: 'ABC123',
      tipoEvento: 'ENTRADA',
      confianzaLectura: 92,
      lecturaManual: false,
      fechaHora: fixedDate.toISOString(),
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Ingreso registrado correctamente',
    };

    cupoRepo.findBySedeAndVehicleType.mockResolvedValue(available);
    cupoRepo.reserveSpot.mockResolvedValue(reserved);
    eventoRepo.create.mockResolvedValue(savedEvent);

    const result = await useCase.execute({
      sedeId: 1,
      placa: 'abc123',
      confianzaLectura: 92,
    });

    expect(result).toEqual({
      requiereValidacionManual: false,
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Ingreso registrado correctamente',
      evento: savedEvent,
      cobro: null,
    });
    expect(cupoRepo.reserveSpot).toHaveBeenCalledWith(1, 'CARRO');
    expect(eventoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sedeId: 1,
        placa: 'ABC123',
        tipoVehiculo: 'CARRO',
        tipoEvento: 'ENTRADA',
        lecturaManual: false,
        resultadoBarrera: 'ABIERTA',
      }),
    );
    expect(billingGenerator.generateOnEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        sedeId: 1,
        eventoIngresoId: 101,
        placa: 'ABC123',
        tipoVehiculo: 'CARRO',
      }),
    );
  });

  it.each(['XYZ45A', 'MNP78'])(
    'clasifica placa de moto %s como MOTO y autoriza el ingreso cuando hay cupo',
    async (motoPlate) => {
      const { useCase, cupoRepo, eventoRepo } = buildUseCase();

      cupoRepo.findBySedeAndVehicleType.mockResolvedValue({
        sedeId: 1,
        tipoVehiculo: 'MOTO',
        capacidadMaxima: 30,
        ocupados: 5,
      });
      cupoRepo.reserveSpot.mockResolvedValue({
        sedeId: 1,
        tipoVehiculo: 'MOTO',
        capacidadMaxima: 30,
        ocupados: 6,
      });
      eventoRepo.create.mockResolvedValue({
        id: 202,
        sedeId: 1,
        tipoVehiculo: 'MOTO',
        usuarioId: null,
        placa: motoPlate,
        tipoEvento: 'ENTRADA',
        confianzaLectura: 90,
        lecturaManual: false,
        fechaHora: fixedDate.toISOString(),
        resultadoBarrera: 'ABIERTA',
        motivo: 'Barrera Abierta: Ingreso registrado correctamente',
      });

      const result = await useCase.execute({
        sedeId: 1,
        placa: motoPlate,
        confianzaLectura: 90,
      });

      expect(result.resultadoBarrera).toBe('ABIERTA');
      expect(result.evento?.tipoVehiculo).toBe('MOTO');
      expect(cupoRepo.reserveSpot).toHaveBeenCalledWith(1, 'MOTO');
    },
  );

  it('rechaza formato de placa inválido lanzando BusinessValidationException sin consultar cupos', async () => {
    const { useCase, cupoRepo, eventoRepo } = buildUseCase();

    await expect(
      useCase.execute({
        sedeId: 1,
        placa: 'AB12',
        confianzaLectura: 95,
      }),
    ).rejects.toThrow(BusinessValidationException);

    expect(cupoRepo.findBySedeAndVehicleType).not.toHaveBeenCalled();
    expect(eventoRepo.create).not.toHaveBeenCalled();
  });

  it('lanza DomainNotFoundException cuando la sede no existe o está inactiva', async () => {
    const { useCase, sedeRepo } = buildUseCase();
    sedeRepo.findActiveById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        sedeId: 99,
        placa: 'ABC123',
        confianzaLectura: 95,
      }),
    ).rejects.toThrow(DomainNotFoundException);
  });

  it('pausa la apertura cuando la confianza es menor al umbral sin descontar cupo ni guardar evento', async () => {
    const { useCase, cupoRepo, eventoRepo } = buildUseCase();

    const result = await useCase.execute({
      sedeId: 1,
      placa: 'MNP789',
      confianzaLectura: 60,
    });

    expect(result).toEqual({
      requiereValidacionManual: true,
      resultadoBarrera: 'CERRADA',
      motivo:
        'Confianza de lectura (60%) inferior al umbral configurado (80%). Requiere validación manual del operador.',
      evento: null,
      cobro: null,
    });
    expect(cupoRepo.reserveSpot).not.toHaveBeenCalled();
    expect(eventoRepo.create).not.toHaveBeenCalled();
  });

  it('muestra estado LLENO y no abre barrera ni registra ingreso cuando cupos disponibles = 0', async () => {
    const { useCase, cupoRepo, eventoRepo } = buildUseCase();

    cupoRepo.findBySedeAndVehicleType.mockResolvedValue({
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 50,
    });

    const result = await useCase.execute({
      sedeId: 1,
      placa: 'ABC123',
      confianzaLectura: 95,
    });

    expect(result).toEqual({
      requiereValidacionManual: false,
      resultadoBarrera: 'LLENO',
      motivo: 'LLENO: No hay cupos disponibles para CARRO en Sede Principal.',
      evento: null,
      cobro: null,
    });
    expect(cupoRepo.reserveSpot).not.toHaveBeenCalled();
    expect(eventoRepo.create).not.toHaveBeenCalled();
  });

  it('responde LLENO si una petición concurrente ocupa el último cupo al intentar reservar', async () => {
    const { useCase, cupoRepo, eventoRepo } = buildUseCase();

    cupoRepo.findBySedeAndVehicleType.mockResolvedValue({
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 49,
    });
    cupoRepo.reserveSpot.mockResolvedValue(null);

    const result = await useCase.execute({
      sedeId: 1,
      placa: 'ABC123',
      confianzaLectura: 95,
    });

    expect(result.resultadoBarrera).toBe('LLENO');
    expect(result.evento).toBeNull();
    expect(eventoRepo.create).not.toHaveBeenCalled();
  });

  it('libera el cupo reservado (compensación) si falla el guardado del evento en BD', async () => {
    const { useCase, cupoRepo, eventoRepo } = buildUseCase();

    cupoRepo.findBySedeAndVehicleType.mockResolvedValue({
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 10,
    });
    cupoRepo.reserveSpot.mockResolvedValue({
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 11,
    });
    eventoRepo.create.mockRejectedValue(new Error('DB write error'));

    await expect(
      useCase.execute({
        sedeId: 1,
        placa: 'ABC123',
        confianzaLectura: 95,
      }),
    ).rejects.toThrow('DB write error');

    expect(cupoRepo.releaseSpot).toHaveBeenCalledWith(1, 'CARRO');
  });
});
