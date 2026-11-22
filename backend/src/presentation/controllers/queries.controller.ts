import { Controller, Get, Query } from '@nestjs/common';
import { ListAccessEventsUseCase } from '../../application/use-cases/queries/list-access-events.use-case';
import { ListChargesUseCase } from '../../application/use-cases/queries/list-charges.use-case';
import type {
  CobroSummary,
  EventoAccesoRecord,
} from '../../domain/access/access.types';
import { Roles } from '../auth/auth.decorators';
import {
  ListarCobrosQueryDto,
  ListarEventosQueryDto,
} from '../dto/consultas-query.dto';

/**
 * Controlador de consultas operativas e históricas (HU-08).
 * Accesible tanto para OPERADOR como para ADMINISTRADOR.
 */
@Roles('ADMINISTRADOR', 'OPERADOR')
@Controller()
export class QueriesController {
  constructor(
    private readonly listAccessEventsUseCase: ListAccessEventsUseCase,
    private readonly listChargesUseCase: ListChargesUseCase,
  ) {}

  @Get('eventos')
  async listarEventos(
    @Query() query: ListarEventosQueryDto,
  ): Promise<EventoAccesoRecord[]> {
    return this.listAccessEventsUseCase.execute({
      placa: query.placa,
      fecha: query.fecha,
      tipoEvento: query.tipoEvento,
      lecturaManual: query.lecturaManual,
    });
  }

  @Get('cobros')
  async listarCobros(
    @Query() query: ListarCobrosQueryDto,
  ): Promise<CobroSummary[]> {
    return this.listChargesUseCase.execute({
      placa: query.placa,
      fechaDiaOperativo: query.fechaDiaOperativo,
      estado: query.estado,
    });
  }
}
