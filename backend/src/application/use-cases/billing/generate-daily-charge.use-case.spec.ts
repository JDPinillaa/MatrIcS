import type {
  CobroSummary,
  EventoAccesoRecord,
  VehicleType,
} from '../../../domain/access/access.types';
import type {
  CreateCobroInput,
  TarifaFranja,
} from '../../../domain/billing/billing.types';
import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import { DomainConflictException } from '../../../domain/exceptions/domain-conflict.exception';
import type { ICobroConsultaRepository } from '../../../domain/ports/cobro-consulta.repository.port';
import type { ICobroRepository } from '../../../domain/ports/cobro.repository.port';
import type { ICupoRepository } from '../../../domain/ports/cupo.repository.port';
import type { IEventoAccesoRepository } from '../../../domain/ports/evento-acceso.repository.port';
import type { ITarifaRepository } from '../../../domain/ports/tarifa.repository.port';
import { SimulatedLprAdapter } from '../../../infrastructure/adapters/simulated-lpr.adapter';
import { RegisterEntryUseCase } from '../access/register-entry.use-case';
import { GenerateDailyChargeUseCase } from './generate-daily-charge.use-case';

/**
 * Almacén en memoria que imita la tabla `cobros`, incluida la restricción
 * UNIQUE (placa, sede_id, fecha_dia_operativo) = `uq_cobros_placa_sede_dia`.
 */
class InMemoryCobros implements ICobroRepository, ICobroConsultaRepository {
  readonly rows: CobroSummary[] = [];
  private nextId = 1;

  async create(input: CreateCobroInput): Promise<CobroSummary> {
    if (this.find(input.placa, input.sedeId, input.fechaDiaOperativo)) {
      throw new DomainConflictException(
        'Ya existe un cobro registrado para esa placa, sede y día operativo',
        'DUPLICATE_DAILY_CHARGE',
      );
    }

    const cobro: CobroSummary = {
      id: this.nextId++,
      sedeId: input.sedeId,
      placa: input.placa,
      tipoVehiculo: input.tipoVehiculo,
      fechaDiaOperativo: input.fechaDiaOperativo,
      franjaAplicada: input.franjaAplicada,
      valorAplicado: input.valorAplicado,
      estado: input.estado,
      generadoEn: input.generadoEn.toISOString(),
      pagadoEn: null,
    };
    this.rows.push(cobro);
    return cobro;
  }

  async findByPlateSedeAndOperationalDay(
    placa: string,
    sedeId: number,
    operationalDay: string,
  ): Promise<CobroSummary | null> {
    return this.find(placa, sedeId, operationalDay);
  }

  private find(
    placa: string,
    sedeId: number,
    day: string,
  ): CobroSummary | null {
    return (
      this.rows.find(
        (c) =>
          c.placa === placa &&
          c.sedeId === sedeId &&
          c.fechaDiaOperativo === day,
      ) ?? null
    );
  }
}

describe('GenerateDailyChargeUseCase - motor de cobro por día operativo (HU-05)', () => {
  // Tarifas sembradas en database/init/02-seed.sql
  const tarifas: Record<VehicleType, TarifaFranja[]> = {
    CARRO: [
      {
        franja: 'DIURNA',
        horaInicio: '06:00:00',
        horaFin: '17:59:00',
        valor: 4000,
      },
      {
        franja: 'NOCTURNA',
        horaInicio: '18:00:00',
        horaFin: '05:59:00',
        valor: 2500,
      },
    ],
    MOTO: [
      {
        franja: 'DIURNA',
        horaInicio: '06:00:00',
        horaFin: '17:59:00',
        valor: 0,
      },
      {
        franja: 'NOCTURNA',
        horaInicio: '18:00:00',
        horaFin: '05:59:00',
        valor: 0,
      },
    ],
  };

  const bogota = (isoLocal: string) => new Date(`${isoLocal}-05:00`);

  function buildEngine(tarifasPorTipo = tarifas) {
    const cobros = new InMemoryCobros();
    const tarifaRepo: jest.Mocked<ITarifaRepository> = {
      findBySedeAndVehicleType: jest.fn(
        async (_sedeId: number, tipo: VehicleType) =>
          tarifasPorTipo[tipo].map((t) => ({ ...t })),
      ),
    };
    const createSpy = jest.spyOn(cobros, 'create');
    const engine = new GenerateDailyChargeUseCase(tarifaRepo, cobros, cobros);
    return { engine, cobros, tarifaRepo, createSpy };
  }

  it('Caso de éxito: CARRO en horario diurno genera un cobro PENDIENTE con la tarifa diurna', async () => {
    const { engine } = buildEngine();

    const cobro = await engine.generateOnEntry({
      sedeId: 1,
      eventoIngresoId: 10,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaHora: bogota('2026-11-21T10:00:00'),
    });

    expect(cobro).toMatchObject({
      placa: 'ABC123',
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      fechaDiaOperativo: '2026-11-21',
      franjaAplicada: 'DIURNA',
      valorAplicado: 4000,
      estado: 'PENDIENTE',
      pagadoEn: null,
    });
  });

  it('CARRO a las 02:30 AM del martes cobra tarifa NOCTURNA en el día operativo del lunes (S-02)', async () => {
    const { engine } = buildEngine();

    const cobro = await engine.generateOnEntry({
      sedeId: 1,
      eventoIngresoId: 11,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaHora: bogota('2026-11-17T02:30:00'),
    });

    expect(cobro).toMatchObject({
      fechaDiaOperativo: '2026-11-16',
      franjaAplicada: 'NOCTURNA',
      valorAplicado: 2500,
      estado: 'PENDIENTE',
    });
  });

  it('MOTO con tarifa $0 queda EXENTA para salir sin pasar por caja (RN-01)', async () => {
    const { engine } = buildEngine();

    const cobro = await engine.generateOnEntry({
      sedeId: 1,
      eventoIngresoId: 12,
      placa: 'XYZ12A',
      tipoVehiculo: 'MOTO',
      fechaHora: bogota('2026-11-21T09:00:00'),
    });

    expect(cobro).toMatchObject({ valorAplicado: 0, estado: 'EXENTO' });
  });

  it('MOTO con tarifa distinta de $0 queda PENDIENTE como cualquier cobro', async () => {
    const { engine } = buildEngine({
      ...tarifas,
      MOTO: [
        {
          franja: 'DIURNA',
          horaInicio: '00:00',
          horaFin: '23:59',
          valor: 1500,
        },
      ],
    });

    const cobro = await engine.generateOnEntry({
      sedeId: 1,
      eventoIngresoId: 13,
      placa: 'XYZ12A',
      tipoVehiculo: 'MOTO',
      fechaHora: bogota('2026-11-21T09:00:00'),
    });

    expect(cobro).toMatchObject({ valorAplicado: 1500, estado: 'PENDIENTE' });
  });

  it('al reingresar el mismo día operativo reutiliza el cobro existente y no crea otro', async () => {
    const { engine, cobros, createSpy } = buildEngine();

    const primero = await engine.generateOnEntry({
      sedeId: 1,
      eventoIngresoId: 20,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaHora: bogota('2026-11-21T10:00:00'),
    });
    // Reingreso a la 01:00 AM: sigue siendo el mismo día operativo (21 de noviembre).
    const reingreso = await engine.generateOnEntry({
      sedeId: 1,
      eventoIngresoId: 21,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaHora: bogota('2026-11-22T01:00:00'),
    });

    expect(reingreso).toEqual(primero);
    expect(cobros.rows).toHaveLength(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('un ingreso desde las 06:00 del día siguiente genera un cobro nuevo (nuevo día operativo)', async () => {
    const { engine, cobros } = buildEngine();

    await engine.generateOnEntry({
      sedeId: 1,
      eventoIngresoId: 30,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaHora: bogota('2026-11-21T10:00:00'),
    });
    const siguienteDia = await engine.generateOnEntry({
      sedeId: 1,
      eventoIngresoId: 31,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaHora: bogota('2026-11-22T06:00:00'),
    });

    expect(siguienteDia?.fechaDiaOperativo).toBe('2026-11-22');
    expect(cobros.rows).toHaveLength(2);
  });

  it('Caso de error: forzar un segundo cobro para la misma placa, sede y día operativo es rechazado', async () => {
    const { engine, cobros } = buildEngine();
    const input = {
      sedeId: 1,
      eventoIngresoId: 40,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO' as const,
      fechaHora: bogota('2026-11-21T10:00:00'),
    };
    await engine.generateOnEntry(input);

    // Inserción directa (saltándose el motor): la restricción única la rechaza.
    await expect(
      cobros.create({
        sedeId: 1,
        eventoIngresoId: 41,
        placa: 'ABC123',
        tipoVehiculo: 'CARRO',
        fechaDiaOperativo: '2026-11-21',
        franjaAplicada: 'DIURNA',
        valorAplicado: 4000,
        estado: 'PENDIENTE',
        generadoEn: bogota('2026-11-21T11:00:00'),
      }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_DAILY_CHARGE' });
    expect(cobros.rows).toHaveLength(1);
  });

  it('ante dos ingresos simultáneos solo se crea un cobro y ambos reciben el mismo', async () => {
    const { engine, cobros } = buildEngine();
    const base = {
      sedeId: 1,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO' as const,
      fechaHora: bogota('2026-11-21T10:00:00'),
    };

    const [a, b] = await Promise.all([
      engine.generateOnEntry({ ...base, eventoIngresoId: 50 }),
      engine.generateOnEntry({ ...base, eventoIngresoId: 51 }),
    ]);

    expect(cobros.rows).toHaveLength(1);
    expect(a?.id).toBe(b?.id);
  });

  it('conserva la tarifa con la que se liquidó aunque luego cambie la tabla de tarifas (RN-07)', async () => {
    const tarifasMutables: Record<VehicleType, TarifaFranja[]> = {
      CARRO: tarifas.CARRO.map((t) => ({ ...t })),
      MOTO: tarifas.MOTO.map((t) => ({ ...t })),
    };
    const { engine, cobros } = buildEngine(tarifasMutables);

    await engine.generateOnEntry({
      sedeId: 1,
      eventoIngresoId: 60,
      placa: 'ABC123',
      tipoVehiculo: 'CARRO',
      fechaHora: bogota('2026-11-21T10:00:00'),
    });
    tarifasMutables.CARRO[0].valor = 9000;

    expect(cobros.rows[0]).toMatchObject({
      franjaAplicada: 'DIURNA',
      valorAplicado: 4000,
    });
  });

  it('lanza TARIFF_NOT_CONFIGURED si no hay tarifa para la franja del ingreso', async () => {
    const { engine } = buildEngine({ ...tarifas, CARRO: [] });

    await expect(
      engine.generateOnEntry({
        sedeId: 1,
        eventoIngresoId: 70,
        placa: 'ABC123',
        tipoVehiculo: 'CARRO',
        fechaHora: bogota('2026-11-21T10:00:00'),
      }),
    ).rejects.toBeInstanceOf(BusinessValidationException);
  });

  it('propaga errores que no son duplicados del día operativo', async () => {
    const { engine, cobros } = buildEngine();
    jest
      .spyOn(cobros, 'create')
      .mockRejectedValueOnce(new Error('conexión caída'));

    await expect(
      engine.generateOnEntry({
        sedeId: 1,
        eventoIngresoId: 80,
        placa: 'ABC123',
        tipoVehiculo: 'CARRO',
        fechaHora: bogota('2026-11-21T10:00:00'),
      }),
    ).rejects.toThrow('conexión caída');
  });

  it('integración con el ingreso (HU-03): el carro entra y queda con su cobro PENDIENTE', async () => {
    const { engine } = buildEngine();
    const now = bogota('2026-11-21T10:00:00');

    const cupoRepo: jest.Mocked<ICupoRepository> = {
      findBySedeAndVehicleType: jest.fn().mockResolvedValue({
        sedeId: 1,
        tipoVehiculo: 'CARRO',
        capacidadMaxima: 50,
        ocupados: 10,
      }),
      reserveSpot: jest.fn().mockResolvedValue({
        sedeId: 1,
        tipoVehiculo: 'CARRO',
        capacidadMaxima: 50,
        ocupados: 11,
      }),
      releaseSpot: jest.fn(),
    };
    const savedEvent: EventoAccesoRecord = {
      id: 101,
      sedeId: 1,
      tipoVehiculo: 'CARRO',
      usuarioId: null,
      placa: 'ABC123',
      tipoEvento: 'ENTRADA',
      confianzaLectura: 95,
      lecturaManual: false,
      fechaHora: now.toISOString(),
      resultadoBarrera: 'ABIERTA',
      motivo: 'Barrera Abierta: Ingreso registrado correctamente',
    };
    const eventoRepo: jest.Mocked<IEventoAccesoRepository> = {
      create: jest.fn().mockResolvedValue(savedEvent),
    };

    const registerEntry = new RegisterEntryUseCase(
      new SimulatedLprAdapter(),
      {
        findActiveById: jest
          .fn()
          .mockResolvedValue({
            id: 1,
            nombre: 'Sede Principal',
            umbralConfianza: 80,
            activa: true,
          }),
      },
      cupoRepo,
      eventoRepo,
      engine,
      { now: () => now },
    );

    const result = await registerEntry.execute({
      sedeId: 1,
      placa: 'abc123',
      confianzaLectura: 95,
    });

    expect(result.resultadoBarrera).toBe('ABIERTA');
    expect(result.evento).toEqual(savedEvent);
    expect(result.cobro).toMatchObject({
      placa: 'ABC123',
      fechaDiaOperativo: '2026-11-21',
      franjaAplicada: 'DIURNA',
      valorAplicado: 4000,
      estado: 'PENDIENTE',
    });
  });
});
