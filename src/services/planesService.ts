/**
 * @file planesService.ts
 * @description Planes de cuidado (`/care-plans/`) y observaciones clínicas (`/observations/`).
 */

import { api } from '@/api/axios';
import {
  CATEGORIA_HACIA_API,
  ESTADO_PLAN_HACIA_API,
  mapObservacion,
  mapPlan,
  mapPlanCreacion,
  mapPlanEdicion,
} from '@/api/mappers/planes';
import type { Api, Paginado } from '@/api/tipos';
import type {
  CategoriaObservacion,
  EstadoPlan,
  Observacion,
  PlanCuidado,
  PlanPayload,
} from '@/types/plan';

/** Criterios opcionales para filtrar planes de cuidado. */
export interface FiltrosPlanes {
  /** Identificador del paciente asociado. */
  pacienteId?: number;
  /** Estado actual del plan de cuidado. */
  estado?: EstadoPlan;
  /** Texto libre de búsqueda. */
  search?: string;
}

/**
 * Obtiene los planes de cuidado que coinciden con los filtros indicados.
 *
 * @param filtros - Criterios opcionales de paciente, estado y búsqueda por texto.
 * @returns Lista de planes de cuidado mapeados al dominio.
 */
export async function listarPlanes(
  filtros: FiltrosPlanes = {}
): Promise<PlanCuidado[]> {
  const { data } = await api.get<Paginado<Api['CarePlan']>>('/care-plans/', {
    params: {
      patient: filtros.pacienteId,
      status: filtros.estado && ESTADO_PLAN_HACIA_API[filtros.estado],
      search: filtros.search?.trim() || undefined,
      page_size: 100,
    },
  });
  return data.results.map(mapPlan);
}

/**
 * Crea un nuevo plan de cuidado para un paciente.
 *
 * @param payload - Datos del plan de cuidado a registrar.
 * @returns Plan de cuidado creado y mapeado al dominio.
 */
export async function crearPlan(payload: PlanPayload): Promise<PlanCuidado> {
  const { data } = await api.post<Api['CarePlan']>(
    '/care-plans/',
    mapPlanCreacion(payload)
  );
  return mapPlan(data);
}

/**
 * Actualiza parcialmente un plan de cuidado existente.
 *
 * @param id - Identificador numérico del plan de cuidado.
 * @param payload - Campos del plan a modificar.
 * @returns Plan de cuidado actualizado y mapeado al dominio.
 */
export async function actualizarPlan(
  id: number,
  payload: PlanPayload
): Promise<PlanCuidado> {
  const { data } = await api.patch<Api['CarePlan']>(
    `/care-plans/${id}/`,
    mapPlanEdicion(payload)
  );
  return mapPlan(data);
}

/**
 * Suspende un plan de cuidado sin eliminarlo del historial para preservar la trazabilidad clínica.
 *
 * @param id - Identificador numérico del plan de cuidado.
 * @returns Plan de cuidado actualizado con estado suspendido.
 */
export async function suspenderPlan(id: number): Promise<PlanCuidado> {
  const { data } = await api.patch<Api['CarePlan']>(`/care-plans/${id}/`, {
    status: 'suspended',
  });
  return mapPlan(data);
}

/**
 * Obtiene las observaciones clínicas registradas para un paciente.
 *
 * @param pacienteId - Identificador numérico del paciente.
 * @returns Lista de observaciones clínicas mapeadas al dominio.
 */
export async function listarObservaciones(
  pacienteId: number
): Promise<Observacion[]> {
  const { data } = await api.get<Paginado<Api['ClinicalObservation']>>(
    '/observations/',
    {
      params: { patient: pacienteId, page_size: 50 },
    }
  );
  return data.results.map(mapObservacion);
}

/**
 * Registra una nueva observación clínica para un paciente.
 *
 * @param pacienteId - Identificador numérico del paciente.
 * @param categoria - Categoría clínica de la observación.
 * @param contenido - Texto descriptivo de la observación.
 * @returns Observación clínica creada y mapeada al dominio.
 */
export async function crearObservacion(
  pacienteId: number,
  categoria: CategoriaObservacion,
  contenido: string
): Promise<Observacion> {
  const { data } = await api.post<Api['ClinicalObservation']>(
    '/observations/',
    {
      patient_id: pacienteId,
      category: CATEGORIA_HACIA_API[categoria],
      content: contenido.trim(),
    }
  );
  return mapObservacion(data);
}

/** Operaciones del servicio REST de planes de cuidado y observaciones clínicas. */
export const planesService = {
  listar: listarPlanes,
  crear: crearPlan,
  actualizar: actualizarPlan,
  suspender: suspenderPlan,
  observaciones: listarObservaciones,
  observar: crearObservacion,
};
