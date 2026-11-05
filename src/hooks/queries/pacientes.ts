/**
 * @file pacientes.ts
 * @description Consultas y mutaciones de pacientes sobre TanStack Query. Reutilizan
 * `pacientesService` (Axios + mappers); aquí solo se define la clave de caché, qué
 * se invalida tras una escritura y los hooks que consumen las pantallas.
 */

import {
  keepPreviousData,
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { pacientesService } from '@/services/pacientesService';
import type {
  EgresoPayload,
  FiltrosPacientes,
  PacientePayload,
} from '@/types/paciente';

import { cunasKeys } from './cunas';
import { reportesKeys } from './reportes';

/** Claves de caché: de lo general a lo específico, para invalidar por prefijo. */
export const pacientesKeys = {
  all: ['pacientes'] as const,
  listas: () => [...pacientesKeys.all, 'lista'] as const,
  lista: (filtros: FiltrosPacientes, tamano: number) =>
    [...pacientesKeys.listas(), { filtros, tamano }] as const,
  detalles: () => [...pacientesKeys.all, 'detalle'] as const,
  detalle: (id: number) => [...pacientesKeys.detalles(), id] as const,
  medicos: () => [...pacientesKeys.all, 'medicos'] as const,
};

/** Opciones de la consulta de un listado filtrado y paginado. */
export function pacientesQueryOptions(
  filtros: FiltrosPacientes = {},
  tamano = 20
) {
  return queryOptions({
    queryKey: pacientesKeys.lista(filtros, tamano),
    queryFn: () => pacientesService.listar(filtros, tamano),
  });
}

/** Opciones de la consulta de un paciente por id. */
export function pacienteQueryOptions(id: number) {
  return queryOptions({
    queryKey: pacientesKeys.detalle(id),
    queryFn: () => pacientesService.obtener(id),
  });
}

/**
 * Listado de pacientes. Mantiene la página anterior visible mientras llega la
 * siguiente, de modo que paginar o filtrar no vacía la tabla.
 */
export function usePacientesQuery(filtros: FiltrosPacientes, tamano = 20) {
  return useQuery({
    ...pacientesQueryOptions(filtros, tamano),
    placeholderData: keepPreviousData,
  });
}

/**
 * Un paciente por id.
 *
 * @param id - Id del paciente; `undefined` deja la consulta inactiva (p. ej. al crear).
 */
export function usePacienteQuery(id: number | undefined) {
  return useQuery({
    ...pacienteQueryOptions(id ?? 0),
    enabled: id !== undefined,
    // La ficha también se modifica desde pantallas que aún no usan la caché
    // (pesos, cunas): al abrirla se pide siempre el dato vigente
    refetchOnMount: 'always',
  });
}

/** Médicos (neonatólogos) asignables como responsables. */
export function useMedicosQuery() {
  return useQuery({
    queryKey: pacientesKeys.medicos(),
    queryFn: () => pacientesService.medicos(),
    // El personal cambia poco: evita pedirlo en cada apertura del formulario
    staleTime: 5 * 60_000,
  });
}

/**
 * Invalida lo que una escritura sobre pacientes deja desactualizado: listados,
 * fichas, la ocupación de cunas y los contadores del resumen operativo.
 */
export function invalidarPacientes(cliente: QueryClient): Promise<unknown> {
  return Promise.all([
    cliente.invalidateQueries({ queryKey: pacientesKeys.all }),
    cliente.invalidateQueries({ queryKey: reportesKeys.all }),
    cliente.invalidateQueries({ queryKey: cunasKeys.all }),
  ]);
}

/** Callback `onSuccess` común a las escrituras de pacientes. */
function useInvalidarPacientes() {
  const cliente = useQueryClient();
  return () => invalidarPacientes(cliente);
}

/** Ingreso de un paciente. */
export function useCrearPacienteMutation() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: (payload: PacientePayload) => pacientesService.crear(payload),
    onSuccess: invalidar,
  });
}

/** Edición de un paciente. */
export function useActualizarPacienteMutation() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: (datos: {
      id: number;
      payload: PacientePayload;
      incluirDatosMedicos: boolean;
    }) =>
      pacientesService.actualizar(datos.id, datos.payload, {
        incluirDatosMedicos: datos.incluirDatosMedicos,
      }),
    onSuccess: invalidar,
  });
}

/** Egreso clínico de un paciente. */
export function useEgresarPacienteMutation() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: (datos: { id: number; payload: EgresoPayload }) =>
      pacientesService.egresar(datos.id, datos.payload),
    onSuccess: invalidar,
  });
}

/** Eliminación definitiva de un paciente (solo administración). */
export function useEliminarPacienteMutation() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: (datos: { id: number; confirmacion: string }) =>
      pacientesService.eliminarDefinitivo(datos.id, datos.confirmacion),
    onSuccess: invalidar,
  });
}
