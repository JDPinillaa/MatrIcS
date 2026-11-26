import type { SiteSettings } from '../../../domain/settings/site-settings.types';

export const siteSettingsFixture: SiteSettings = {
  sedeId: 1,
  nombreSede: 'Sede Principal',
  umbralConfianza: 80,
  tarifas: [
    { tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 4000 },
    { tipoVehiculo: 'CARRO', franja: 'NOCTURNA', valor: 2500 },
    { tipoVehiculo: 'MOTO', franja: 'DIURNA', valor: 0 },
    { tipoVehiculo: 'MOTO', franja: 'NOCTURNA', valor: 0 },
  ],
  franjas: [
    { nombre: 'DIURNA', horaInicio: '06:00:00', horaFin: '17:59:00' },
    { nombre: 'NOCTURNA', horaInicio: '18:00:00', horaFin: '05:59:00' },
  ],
  cupos: [
    { tipoVehiculo: 'CARRO', capacidadMaxima: 50, ocupados: 12, disponibles: 38 },
    { tipoVehiculo: 'MOTO', capacidadMaxima: 30, ocupados: 3, disponibles: 27 },
  ],
};