/**
 * @file reportesService.ts
 * @description Consultas HTTP de indicadores operativos y serie de actividad.
 */

import { api } from '@/api/axios';
import { mapReporte, mapSerie } from '@/api/mappers/reportes';
import type { Api } from '@/api/tipos';
import type { ReporteOperacion, SerieActividad } from '@/types/reporte';

export async function obtenerReporte(): Promise<ReporteOperacion> {
  const [resumen, turnos] = await Promise.all([
    api.get<Api['OperationsSummary']>('/reports/summary/'),
    api.get<Api['Shift'][]>('/shifts/'),
  ]);
  return mapReporte(resumen.data, turnos.data);
}

export async function obtenerSerie(dias = 14): Promise<SerieActividad> {
  const { data } = await api.get<Api['ActivityPoint'][]>('/reports/series/', {
    params: { days: dias },
  });
  return mapSerie(data);
}

export const reportesService = {
  reporte: obtenerReporte,
  serie: obtenerSerie,
};
