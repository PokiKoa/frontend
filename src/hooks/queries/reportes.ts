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

/** Fábrica de claves de caché de TanStack Query para el dominio de reportes. */
export const reportesKeys = {
  /** Clave raíz para invalidar todas las consultas de reportes operativos y series. */
  all: ['reportes'] as const,
  /** Clave para el resumen general de contadores de la unidad. */
  resumen: () => [...reportesKeys.all, 'resumen'] as const,
  /** Clave parametrizada para la serie histórica diaria según la ventana de días. */
  serie: (dias: number) => [...reportesKeys.all, 'serie', dias] as const,
};

/**
 * Construye las opciones de consulta de TanStack Query para obtener el reporte
 * operativo con los indicadores principales de la unidad neonatal.
 *
 * @returns Configuración tipada (`queryOptions`) reutilizable en `useQuery` o prefetch.
 */
export function reporteQueryOptions() {
  return queryOptions({
    queryKey: reportesKeys.resumen(),
    queryFn: () => reportesService.reporte(),
  });
}

/**
 * Hook de consulta para obtener los contadores operativos actuales de la unidad.
 *
 * @returns Resultado reactivo `UseQueryResult` con el resumen operativo.
 */
export function useReporteQuery() {
  return useQuery(reporteQueryOptions());
}

/**
 * Construye las opciones de consulta para la serie diaria de ingresos y alertas.
 * Conserva los datos del periodo anterior (`keepPreviousData`) mientras carga el nuevo rango.
 *
 * @param dias - Cantidad de días hacia atrás incluidos en la serie histórica.
 * @returns Configuración tipada (`queryOptions`) lista para `useQuery`.
 */
export function serieQueryOptions(dias: number) {
  return queryOptions({
    queryKey: reportesKeys.serie(dias),
    queryFn: () => reportesService.serie(dias),
    // Mantiene la serie anterior visible mientras carga el nuevo periodo
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook de consulta para obtener la serie diaria de ingresos y alertas en un rango de días.
 *
 * @param dias - Cantidad de días hacia atrás a consultar.
 * @returns Resultado reactivo `UseQueryResult` con los puntos diarios de la serie.
 */
export function useSerieQuery(dias: number) {
  return useQuery(serieQueryOptions(dias));
}
