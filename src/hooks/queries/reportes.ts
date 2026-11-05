/**
 * @file reportes.ts
 * @description Consulta del reporte operativo (contadores de la unidad). Los
 * cambios en pacientes la invalidan para mantener los contadores al día.
 */

import { queryOptions, useQuery } from '@tanstack/react-query';

import { reportesService } from '@/services/reportesService';

export const reportesKeys = {
  all: ['reportes'] as const,
  resumen: () => [...reportesKeys.all, 'resumen'] as const,
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
