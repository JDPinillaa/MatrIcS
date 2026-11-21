export type VehicleType = 'CARRO' | 'MOTO';

export type AccessEventType = 'ENTRADA' | 'SALIDA';

export type BarrierResult = 'ABIERTA' | 'CERRADA' | 'LLENO';

export type ChargeStatus = 'PENDIENTE' | 'PAGADO' | 'EXENTO' | 'ANULADO';

export interface PlateReading {
  placa: string;
  confianza: number;
}

export interface SedeConfig {
  id: number;
  nombre: string;
  umbralConfianza: number;
  activa: boolean;
}

export interface CupoSnapshot {
  sedeId: number;
  tipoVehiculo: VehicleType;
  capacidadMaxima: number;
  ocupados: number;
}

export interface EventoAccesoRecord {
  id: number;
  sedeId: number;
  tipoVehiculo: VehicleType;
  usuarioId: number | null;
  placa: string;
  tipoEvento: AccessEventType;
  confianzaLectura: number;
  lecturaManual: boolean;
  fechaHora: string;
  resultadoBarrera: BarrierResult;
  motivo: string | null;
}

export interface CreateEventoAccesoInput {
  sedeId: number;
  tipoVehiculo: VehicleType;
  usuarioId: number | null;
  placa: string;
  tipoEvento: AccessEventType;
  confianzaLectura: number;
  lecturaManual: boolean;
  fechaHora: Date;
  resultadoBarrera: BarrierResult;
  motivo: string;
}

export interface CobroSummary {
  id: number;
  sedeId: number;
  placa: string;
  tipoVehiculo: VehicleType;
  fechaDiaOperativo: string;
  franjaAplicada: string;
  valorAplicado: number;
  estado: ChargeStatus;
  generadoEn: string;
  pagadoEn: string | null;
}
