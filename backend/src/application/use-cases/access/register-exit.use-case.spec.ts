import type {
  CobroSummary,
  EventoAccesoRecord,
  SedeConfig,
} from '../../../domain/access/access.types';
import { PlateClassifier } from '../../../domain/access/plate-classifier';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import { DomainNotFoundException } from '../../../domain/exceptions/domain-not-found.exception';
import type { IClock } from '../../../domain/ports/clock.port';
import type { ICobroConsultaRepository } from '../../../domain/ports/cobro-consulta.repository.port';
import type { ICupoRepository } from '../../../domain/ports/cupo.repository.port';
import type { IEventoAccesoRepository } from '../../../domain/ports/evento-acceso.repository.port';
import type { ILprReader } from '../../../domain/ports/lpr-reader.port';
import type { ISedeConfigRepository } from '../../../domain/ports/sede-config.repository.port';
import { RegisterExitUseCase } from './register-exit.use-case';

describe('RegisterExitUseCase (HU-07)', () => {
  const activeSede: SedeConfig = {
    id: 1,
    nombre: 'Sede Principal',
    umbralConfianza: 80,
    activa: true,
  };

  // Martes 2026-11-17 02:30 AM Bogotá -> día operativo 2026-11-16 (S-02)
  const earlyMorningBogota = new Date('2026-11-17T02:30:00-05:00');

  function buildUseCase(now: Date = earlyMorningBogota) {
    const lprReader: jest.Mocked<ILprReader> = {
      readPlate: jest.fn(async ({ placa, confianzaLectura }) => ({
        placa: placa.trim().toUpperCase(),
        confianza: confianzaLectura,
      })),
    };

    const sedeRepo: jest.Mocked<ISedeConfigRepository> = {
      findActiveById: jest.fn().mockResolvedValue(activeSede),
    };

    const cobroRepo: jest.Mocked<ICobroConsultaRepository> = {
      findByPlateSedeAndOperationalDay: jest.fn(),
    };

    const cupoRepo: jest.Mocked<ICupoRepository> = {
      findBySedeAndVehicleType: jest.fn(),
      reserveSpot: jest.fn(),
      releaseSpot: jest.fn().mockResolvedValue({
        sedeId: 1,
        tipoVehiculo: 'CARRO',
        capacidadMaxima: 50,
        ocupados: 9,
      }),
    };

    const eventoRepo: jest.Mocked<IEventoAccesoRepository> = {
      create: jest.fn(),
    };

    const clock: IClock = { now: () => now };

    const useCase = new RegisterExitUseCase(
      lprReader,
      sedeRepo,
      cobroRepo,
      cupoRepo,
      eventoRepo,
      clock,
      new PlateClassifier(),
    );

    return { useCase, sedeRepo, cobroRepo, cupoRepo, eventoRepo };
  }

  it('abre barrera, registra salida y libera cupo cuando un CARRO tiene cobro PAGADO (pase diario vigente)', async () => {
    const { useCase, cobroRepo, cupoRepo, eventoRepo } = buildUseCase();

    const paidCharge: CobroSummary = {
      id: 55,
      sedeId: 1,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaDiaOperativo: '2026-11-16',
      franjaAplicada: 'DIURNA',
      valorAplicado: 4000,
      estado: 'PAGADO',
      generadoEn: '2026-11-16T14:00:00.000Z',
      pagadoEn: '2026-11-16T16:00:00.000Z',
    };
    const savedEvent: EventoAccesoRecord = {
      id: 301,
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      usuarioId: null,
      placa: 'ABC123',
      tipoEvento: 'SALIDA',
      confianzaLectura: 94,
      lecturaManual: false,
      fechaHora: earlyMorningBogota.toISOString(),
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Pase diario vigente',
    };

    cobroRepo.findByPlateSedeAndOperationalDay.mockResolvedValue(paidCharge);
    eventoRepo.create.mockResolvedValue(savedEvent);

    const result = await useCase.execute({
      sedeId: 1,
      placa: 'abc123',
      confianzaLectura: 94,
    });

    expect(cobroRepo.findByPlateSedeAndOperationalDay).toHaveBeenCalledWith(
      'ABC123',
      1,
      '2026-11-16',
    );
    expect(result).toEqual({
      requiereValidacionManual: false,
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Pase diario vigente',
      evento: savedEvent,
    });
    expect(cupoRepo.releaseSpot).toHaveBeenCalledWith(1, 'CARRO');
  });

  it('abre barrera y libera cupo para una MOTO exenta sin cobro pendiente (escenario demo)', async () => {
    const { useCase, cobroRepo, cupoRepo, eventoRepo } = buildUseCase();

    cobroRepo.findByPlateSedeAndOperationalDay.mockResolvedValue(null);
    eventoRepo.create.mockResolvedValue({
      id: 302,
      sedeId: 1,
      tipoVehiculo: 'MOTO',
      usuarioId: null,
      placa: 'JKL45A',
      tipoEvento: 'SALIDA',
      confianzaLectura: 91,
      lecturaManual: false,
      fechaHora: earlyMorningBogota.toISOString(),
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Moto exenta de cobro',
    });

    const result = await useCase.execute({
      sedeId: 1,
      placa: 'JKL45A',
      confianzaLectura: 91,
    });

    expect(result.resultadoBarrera).toBe('ABIERTA');
    expect(result.motivo).toBe('Barrera Abierta: Moto exenta de cobro');
    expect(cupoRepo.releaseSpot).toHaveBeenCalledWith(1, 'MOTO');
  });

  it('mantiene barrera CERRADA, no registra salida ni libera cupo si el cobro está PENDIENTE (RN-06)', async () => {
    const { useCase, cobroRepo, cupoRepo, eventoRepo } = buildUseCase();

    cobroRepo.findByPlateSedeAndOperationalDay.mockResolvedValue({
      id: 56,
      sedeId: 1,
      placa: 'XYZ789',
      tipoVehiculo: 'CARRO',
      fechaDiaOperativo: '2026-11-16',
      franjaAplicada: 'DIURNA',
      valorAplicado: 4000,
      estado: 'PENDIENTE',
      generadoEn: '2026-11-16T15:00:00.000Z',
      pagadoEn: null,
    });

    const result = await useCase.execute({
      sedeId: 1,
      placa: 'XYZ789',
      confianzaLectura: 95,
    });

    expect(result).toEqual({
      requiereValidacionManual: false,
      resultadoBarrera: 'CERRADA',
      motivo: 'Barrera Cerrada: Cobro pendiente de pago',
      evento: null,
    });
    expect(eventoRepo.create).not.toHaveBeenCalled();
    expect(cupoRepo.releaseSpot).not.toHaveBeenCalled();
  });

  it('pausa la salida para validación manual cuando la confianza está bajo el umbral', async () => {
    const { useCase, cobroRepo, cupoRepo, eventoRepo } = buildUseCase();

    const result = await useCase.execute({
      sedeId: 1,
      placa: 'ABC123',
      confianzaLectura: 55,
    });

    expect(result).toEqual({
      requiereValidacionManual: true,
      resultadoBarrera: 'CERRADA',
      motivo:
        'Confianza de lectura (55%) inferior al umbral configurado (80%). Requiere validación manual del operador.',
      evento: null,
    });
    expect(cobroRepo.findByPlateSedeAndOperationalDay).not.toHaveBeenCalled();
    expect(eventoRepo.create).not.toHaveBeenCalled();
    expect(cupoRepo.releaseSpot).not.toHaveBeenCalled();
  });

  it('rechaza formato de placa inválido lanzando BusinessValidationException', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        sedeId: 1,
        placa: '123456',
        confianzaLectura: 90,
      }),
    ).rejects.toThrow(BusinessValidationException);
  });

  it('lanza DomainNotFoundException cuando la sede no existe o está inactiva', async () => {
    const { useCase, sedeRepo } = buildUseCase();
    sedeRepo.findActiveById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        sedeId: 404,
        placa: 'ABC123',
        confianzaLectura: 90,
      }),
    ).rejects.toThrow(DomainNotFoundException);
  });
});
