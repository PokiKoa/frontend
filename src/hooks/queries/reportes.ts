/**
 * @file reportes.ts
 * @description Consultas del reporte operativo (contadores de la unidad) y de
 * la serie de actividad. Los cambios en pacientes invalidan el prefijo
 * `reportes` para mantener los contadores al día.
 */

import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

import { reportesService } from '@/services/reportesService';

export const reportesKeys = {
  all: ['reportes'] as const,
  resumen: () => [...reportesKeys.all, 'resumen'] as const,
  serie: (dias: number) => [...reportesKeys.all, 'serie', dias] as const,
};

/** Opciones de la consulta del reporte operativo. */
export function reporteQueryOptions() {
  return queryOptions({
    queryKey: reportesKeys.resumen(),
    queryFn: () => reportesService.reporte(),
  });
}

/** Reporte operativo de la unidad. */
export function useReporteQuery() {
  return useQuery(reporteQueryOptions());
}

/** Opciones de la consulta de la serie de actividad de los últimos `dias`. */
export function serieQueryOptions(dias: number) {
  return queryOptions({
    queryKey: reportesKeys.serie(dias),
    queryFn: () => reportesService.serie(dias),
    // Mantiene la serie anterior visible mientras carga el nuevo periodo
    placeholderData: keepPreviousData,
  });
}

/** Serie diaria de ingresos y alertas. */
export function useSerieQuery(dias: number) {
  return useQuery(serieQueryOptions(dias));
}
