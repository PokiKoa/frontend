/**
 * @file reportesService.ts
 * @description Consultas HTTP de indicadores operativos y serie de actividad.
 */

import { api } from '@/api/axios';
import { mapReporte, mapSerie } from '@/api/mappers/reportes';
import type { Api } from '@/api/tipos';
import type { ReporteOperacion, SerieActividad } from '@/types/reporte';

/**
 * Obtiene el resumen operativo general de la unidad junto con los turnos vigentes
 * y los transforma al modelo de reporte del dominio.
 *
 * @returns Reporte operativo consolidado.
 */
export async function obtenerReporte(): Promise<ReporteOperacion> {
  const [resumen, turnos] = await Promise.all([
    api.get<Api['OperationsSummary']>('/reports/summary/'),
    api.get<Api['Shift'][]>('/shifts/'),
  ]);
  return mapReporte(resumen.data, turnos.data);
}

/**
 * Obtiene la serie temporal de actividad de la unidad para la ventana de días indicada.
 *
 * @param dias - Cantidad de días hacia atrás a consultar (por defecto 14).
 * @returns Serie de actividad mapeada al dominio.
 */
export async function obtenerSerie(dias = 14): Promise<SerieActividad> {
  const { data } = await api.get<Api['ActivityPoint'][]>('/reports/series/', {
    params: { days: dias },
  });
  return mapSerie(data);
}

/** Operaciones del servicio REST de reportes e indicadores operativos. */
export const reportesService = {
  reporte: obtenerReporte,
  serie: obtenerSerie,
};