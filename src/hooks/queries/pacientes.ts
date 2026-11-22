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
  /** Clave raíz para invalidar todas las consultas del dominio de pacientes. */
  all: ['pacientes'] as const,
  /** Prefijo para todos los listados paginados de pacientes. */
  listas: () => [...pacientesKeys.all, 'lista'] as const,
  /** Clave parametrizada para un listado con filtros y tamaño de página específicos. */
  lista: (filtros: FiltrosPacientes, tamano: number) =>
    [...pacientesKeys.listas(), { filtros, tamano }] as const,
  /** Prefijo para todas las fichas individuales de pacientes. */
  detalles: () => [...pacientesKeys.all, 'detalle'] as const,
  /** Clave específica para la ficha clínica de un paciente según su ID. */
  detalle: (id: number) => [...pacientesKeys.detalles(), id] as const,
  /** Clave para el catálogo de médicos tratantes asignables. */
  medicos: () => [...pacientesKeys.all, 'medicos'] as const,
};

/**
 * Construye las opciones de consulta de TanStack Query para obtener un listado
 * filtrado y paginado de pacientes.
 *
 * @param filtros - Criterios de búsqueda y filtrado aplicables al listado.
 * @param tamano - Cantidad máxima de registros por página (por defecto `20`).
 * @returns Configuración tipada (`queryOptions`) lista para `useQuery` o prefetch.
 */
export function pacientesQueryOptions(
  filtros: FiltrosPacientes = {},
  tamano = 20
) {
  return queryOptions({
    queryKey: pacientesKeys.lista(filtros, tamano),
    queryFn: () => pacientesService.listar(filtros, tamano),
  });
}

/**
 * Construye las opciones de consulta de TanStack Query para obtener la ficha
 * detallada de un paciente por su identificador.
 *
 * @param id - Identificador numérico del paciente.
 * @returns Configuración tipada (`queryOptions`) lista para `useQuery` o prefetch.
 */
export function pacienteQueryOptions(id: number) {
  return queryOptions({
    queryKey: pacientesKeys.detalle(id),
    queryFn: () => pacientesService.obtener(id),
  });
}

/**
 * Hook de consulta para el listado paginado de pacientes. Mantiene los datos de
 * la página anterior visibles (`keepPreviousData`) mientras responde la siguiente
 * petición, evitando parpadeos al paginar o filtrar.
 *
 * @param filtros - Criterios de búsqueda y estado clínico.
 * @param tamano - Cantidad de filas por página (por defecto `20`).
 * @returns Resultado reactivo `UseQueryResult` con la página de pacientes.
 */
export function usePacientesQuery(filtros: FiltrosPacientes, tamano = 20) {
  return useQuery({
    ...pacientesQueryOptions(filtros, tamano),
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook de consulta para obtener un paciente individual por su ID. Fuerza la
 * recarga al montar (`refetchOnMount: 'always'`) porque otras pantallas externas
 * a esta caché (pesos, cunas) pueden modificar la ficha.
 *
 * @param id - ID del paciente; si es `undefined`, la consulta permanece deshabilitada (p. ej. al crear).
 * @returns Resultado reactivo `UseQueryResult` con los datos del paciente.
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

/**
 * Hook de consulta para el catálogo de médicos (neonatólogos) asignables como
 * responsables. Utiliza un `staleTime` de 5 minutos para evitar peticiones redundantes.
 *
 * @returns Resultado reactivo `UseQueryResult` con el listado de médicos.
 */
export function useMedicosQuery() {
  return useQuery({
    queryKey: pacientesKeys.medicos(),
    queryFn: () => pacientesService.medicos(),
    // El personal cambia poco: evita pedirlo en cada apertura del formulario
    staleTime: 5 * 60_000,
  });
}

/**
 * Invalida en paralelo todas las consultas afectadas por una escritura sobre pacientes:
 * listados y fichas de pacientes, ocupación de cunas y contadores de reportes operativos.
 *
 * @param cliente - Instancia activa de `QueryClient`.
 * @returns Promesa que resuelve cuando todas las invalidaciones han sido disparadas.
 */
export function invalidarPacientes(cliente: QueryClient): Promise<unknown> {
  return Promise.all([
    cliente.invalidateQueries({ queryKey: pacientesKeys.all }),
    cliente.invalidateQueries({ queryKey: reportesKeys.all }),
    cliente.invalidateQueries({ queryKey: cunasKeys.all }),
  ]);
}

/**
 * Hook interno que encapsula el callback `onSuccess` compartido por las
 * mutaciones de pacientes para refrescar la caché relacionada.
 *
 * @returns Función sin argumentos que ejecuta `invalidarPacientes`.
 */
function useInvalidarPacientes() {
  const cliente = useQueryClient();
  return () => invalidarPacientes(cliente);
}

/**
 * Mutación para registrar el ingreso de un nuevo paciente neonatal.
 * Invalida automáticamente pacientes, cunas y reportes al completarse.
 *
 * @returns Objeto `UseMutationResult` cuya función espera un `PacientePayload`.
 */
export function useCrearPacienteMutation() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: (payload: PacientePayload) => pacientesService.crear(payload),
    onSuccess: invalidar,
  });
}

/**
 * Mutación para actualizar los datos de un paciente existente, respetando el
 * permiso de edición sobre campos clínicos (`incluirDatosMedicos`).
 *
 * @returns Objeto `UseMutationResult` cuya función recibe `{ id, payload, incluirDatosMedicos }`.
 */
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

/**
 * Mutación para registrar el egreso clínico de un paciente y liberar su cuna asignada.
 *
 * @returns Objeto `UseMutationResult` cuya función recibe `{ id, payload }`.
 */
export function useEgresarPacienteMutation() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: (datos: { id: number; payload: EgresoPayload }) =>
      pacientesService.egresar(datos.id, datos.payload),
    onSuccess: invalidar,
  });
}

/**
 * Mutación para ejecutar la eliminación definitiva de un paciente (operación
 * restringida a administración con cadena de confirmación).
 *
 * @returns Objeto `UseMutationResult` cuya función recibe `{ id, confirmacion }`.
 */
export function useEliminarPacienteMutation() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: (datos: { id: number; confirmacion: string }) =>
      pacientesService.eliminarDefinitivo(datos.id, datos.confirmacion),
    onSuccess: invalidar,
  });
}