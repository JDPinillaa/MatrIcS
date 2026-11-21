import type {
  CobroSummary,
  CupoSnapshot,
  EventoAccesoRecord,
  SedeConfig,
} from '../../../domain/access/access.types';
import { PlateClassifier } from '../../../domain/access/plate-classifier';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import { DomainNotFoundException } from '../../../domain/exceptions/domain-not-found.exception';
import type { IBillingGeneratorPort } from '../../../domain/ports/billing-generator.port';
import type { IClock } from '../../../domain/ports/clock.port';
import type { ICobroConsultaRepository } from '../../../domain/ports/cobro-consulta.repository.port';
import type { ICupoRepository } from '../../../domain/ports/cupo.repository.port';
import type { IEventoAccesoRepository } from '../../../domain/ports/evento-acceso.repository.port';
import type { ISedeConfigRepository } from '../../../domain/ports/sede-config.repository.port';
import { ValidateManualAccessUseCase } from './validate-manual-access.use-case';

describe('ValidateManualAccessUseCase (HU-04)', () => {
  const activeSede: SedeConfig = {
    id: 1,
    nombre: 'Sede Principal',
    umbralConfianza: 80,
    activa: true,
  };

  const fixedDate = new Date('2026-11-21T14:35:00.000Z');

  function buildUseCase() {
    const sedeRepo: jest.Mocked<ISedeConfigRepository> = {
      findActiveById: jest.fn().mockResolvedValue(activeSede),
      updateConfidenceThreshold: jest.fn(),
    };

    const cupoRepo: jest.Mocked<ICupoRepository> = {
      findBySedeAndVehicleType: jest.fn(),
      reserveSpot: jest.fn(),
      releaseSpot: jest.fn(),
    };

    const eventoRepo: jest.Mocked<IEventoAccesoRepository> = {
      create: jest.fn(),
    };

    const cobroConsultaRepo: jest.Mocked<ICobroConsultaRepository> = {
      findByPlateSedeAndOperationalDay: jest.fn(),
    };

    const billingGenerator: jest.Mocked<IBillingGeneratorPort> = {
      generateOnEntry: jest.fn().mockResolvedValue(null),
    };

    const clock: IClock = {
      now: () => fixedDate,
    };

    const useCase = new ValidateManualAccessUseCase(
      sedeRepo,
      cupoRepo,
      eventoRepo,
      cobroConsultaRepo,
      billingGenerator,
      clock,
      new PlateClassifier(),
    );

    return {
      useCase,
      sedeRepo,
      cupoRepo,
      eventoRepo,
      cobroConsultaRepo,
      billingGenerator,
    };
  }

  it('Caso de Éxito HU-04: confirma placa MNP789 con 60% de confianza, abre barrera y registra evento como LECTURA_MANUAL', async () => {
    const { useCase, cupoRepo, eventoRepo, billingGenerator } = buildUseCase();

    const available: CupoSnapshot = {
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      capacidadMaxima: 50,
      ocupados: 10,
    };
    const reserved: CupoSnapshot = { ...available, ocupados: 11 };
    const savedEvent: EventoAccesoRecord = {
      id: 301,
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      usuarioId: 2,
      placa: 'MNP789',
      tipoEvento: 'ENTRADA',
      confianzaLectura: 60,
      lecturaManual: true,
      fechaHora: fixedDate.toISOString(),
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Ingreso confirmado manualmente por el operador (LECTURA_MANUAL)',
    };

    cupoRepo.findBySedeAndVehicleType.mockResolvedValue(available);
    cupoRepo.reserveSpot.mockResolvedValue(reserved);
    eventoRepo.create.mockResolvedValue(savedEvent);

    const result = await useCase.execute({
      sedeId: 1,
      tipoEvento: 'ENTRADA',
      accion: 'CONFIRMAR',
      placaCorregida: 'mnp789',
      confianzaOriginal: 60,
    });

    expect(result).toEqual({
      descartado: false,
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Ingreso confirmado manualmente por el operador (LECTURA_MANUAL)',
      evento: savedEvent,
      cobro: null,
    });
    expect(cupoRepo.reserveSpot).toHaveBeenCalledWith(1, 'CARRO');
    expect(eventoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sedeId: 1,
        placa: 'MNP789',
        tipoVehiculo: 'CARRO',
        tipoEvento: 'ENTRADA',
        confianzaLectura: 60,
        lecturaManual: true,
        usuarioId: 2,
        resultadoBarrera: 'ABIERTA',
        motivo: expect.stringContaining('LECTURA_MANUAL'),
      }),
    );
    expect(billingGenerator.generateOnEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        sedeId: 1,
        eventoIngresoId: 301,
        placa: 'MNP789',
        tipoVehiculo: 'CARRO',
      }),
    );
  });

  it('Caso de Error HU-04: rechaza placa corregida con formato inválido (AB12) sin abrir barrera ni guardar evento', async () => {
    const { useCase, cupoRepo, eventoRepo } = buildUseCase();

    await expect(
      useCase.execute({
        sedeId: 1,
        tipoEvento: 'ENTRADA',
        accion: 'CONFIRMAR',
        placaCorregida: 'AB12',
        confianzaOriginal: 60,
      }),
    ).rejects.toThrow(BusinessValidationException);

    expect(cupoRepo.reserveSpot).not.toHaveBeenCalled();
    expect(eventoRepo.create).not.toHaveBeenCalled();
  });

  it('permite descartar la lectura por falso positivo manteniendo la barrera CERRADA sin registrar evento', async () => {
    const { useCase, cupoRepo, eventoRepo } = buildUseCase();

    const result = await useCase.execute({
      sedeId: 1,
      tipoEvento: 'ENTRADA',
      accion: 'DESCARTAR',
      confianzaOriginal: 60,
    });

    expect(result).toEqual({
      descartado: true,
      resultadoBarrera: 'CERRADA',
      motivo: 'Barrera Cerrada: Lectura descartada manualmente por el operador (LECTURA_MANUAL)',
      evento: null,
      cobro: null,
    });
    expect(cupoRepo.reserveSpot).not.toHaveBeenCalled();
    expect(eventoRepo.create).not.toHaveBeenCalled();
  });

  it('confirma salida manual cuando el cobro del día operativo está PAGADO y libera 1 cupo con LECTURA_MANUAL', async () => {
    const { useCase, cobroConsultaRepo, cupoRepo, eventoRepo } = buildUseCase();

    const paidCharge: CobroSummary = {
      id: 88,
      sedeId: 1,
      placa: 'MNP789',
      tipoVehiculo: 'CARRO',
      fechaDiaOperativo: '2026-11-21',
      franjaAplicada: 'DIURNA',
      valorAplicado: 4000,
      estado: 'PAGADO',
      generadoEn: fixedDate.toISOString(),
      pagadoEn: fixedDate.toISOString(),
    };
    const savedExit: EventoAccesoRecord = {
      id: 302,
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      usuarioId: 2,
      placa: 'MNP789',
      tipoEvento: 'SALIDA',
      confianzaLectura: 55,
      lecturaManual: true,
      fechaHora: fixedDate.toISOString(),
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Salida confirmada manualmente por el operador (LECTURA_MANUAL)',
    };

    cobroConsultaRepo.findByPlateSedeAndOperationalDay.mockResolvedValue(paidCharge);
    eventoRepo.create.mockResolvedValue(savedExit);

    const result = await useCase.execute({
      sedeId: 1,
      tipoEvento: 'SALIDA',
      accion: 'CONFIRMAR',
      placaCorregida: 'MNP789',
      confianzaOriginal: 55,
    });

    expect(result.resultadoBarrera).toBe('ABIERTA');
    expect(result.evento?.lecturaManual).toBe(true);
    expect(result.motivo).toContain('LECTURA_MANUAL');
    expect(cupoRepo.releaseSpot).toHaveBeenCalledWith(1, 'CARRO');
  });

  it('lanza DomainNotFoundException si la sede no existe', async () => {
    const { useCase, sedeRepo } = buildUseCase();
    sedeRepo.findActiveById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        sedeId: 999,
        tipoEvento: 'ENTRADA',
        accion: 'CONFIRMAR',
        placaCorregida: 'MNP789',
        confianzaOriginal: 60,
      }),
    ).rejects.toThrow(DomainNotFoundException);
  });
});
