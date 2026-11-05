/**
 * @file cunas.ts
 * @description Consulta del panel de cunas. Se invalida cuando una escritura de
 * pacientes cambia la ocupación (ingreso con cuna, egreso).
 */

import { queryOptions, useQuery } from '@tanstack/react-query';

import { cunasService } from '@/services/cunasService';

export const cunasKeys = {
  all: ['cunas'] as const,
  lista: () => [...cunasKeys.all, 'lista'] as const,
};

/** Opciones de la consulta de cunas con su paciente y estado. */
export function cunasQueryOptions() {
  return queryOptions({
    queryKey: cunasKeys.lista(),
    queryFn: () => cunasService.listar(),
  });
}

/**
 * Cunas de la unidad.
 *
 * @param habilitada - `false` evita la petición (p. ej. al editar, donde no se elige cuna).
 */
export function useCunasQuery(habilitada = true) {
  return useQuery({ ...cunasQueryOptions(), enabled: habilitada });
}
