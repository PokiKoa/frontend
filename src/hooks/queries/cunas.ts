/**
 * @file cunas.ts
 * @description Consulta del panel de cunas. Se invalida cuando una escritura de
 * pacientes cambia la ocupación (ingreso con cuna, egreso).
 */

import { queryOptions, useQuery } from '@tanstack/react-query';

import { cunasService } from '@/services/cunasService';

/** Fábrica de claves de caché de TanStack Query para el dominio de cunas. */
export const cunasKeys = {
  /** Clave raíz para invalidar todas las consultas relacionadas con cunas. */
  all: ['cunas'] as const,
  /** Clave específica para el listado general de cunas con su estado y paciente asignado. */
  lista: () => [...cunasKeys.all, 'lista'] as const,
};

/**
 * Construye las opciones de consulta de TanStack Query para obtener el listado
 * completo de cunas de la unidad junto con su paciente asignado y estado operativo.
 *
 * @returns Objeto de configuración tipado (`queryOptions`) reutilizable en `useQuery` o prefetch.
 */
export function cunasQueryOptions() {
  return queryOptions({
    queryKey: cunasKeys.lista(),
    queryFn: () => cunasService.listar(),
  });
}

/**
 * Hook de consulta para obtener las cunas de la unidad neonatal.
 *
 * @param habilitada - Si es `false`, suspende la petición de red (por ejemplo, al editar un paciente donde no se reasigna cuna).
 * @returns Resultado reactivo `UseQueryResult` con el arreglo de cunas y estados de carga/error.
 */
export function useCunasQuery(habilitada = true) {
  return useQuery({ ...cunasQueryOptions(), enabled: habilitada });
}
