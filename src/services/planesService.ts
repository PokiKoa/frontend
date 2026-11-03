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

export interface FiltrosPlanes {
  pacienteId?: number;
  estado?: EstadoPlan;
  search?: string;
}

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

export async function crearPlan(payload: PlanPayload): Promise<PlanCuidado> {
  const { data } = await api.post<Api['CarePlan']>(
    '/care-plans/',
    mapPlanCreacion(payload)
  );
  return mapPlan(data);
}

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

/** Los planes no se eliminan (trazabilidad clínica): se suspenden. */
export async function suspenderPlan(id: number): Promise<PlanCuidado> {
  const { data } = await api.patch<Api['CarePlan']>(`/care-plans/${id}/`, {
    status: 'suspended',
  });
  return mapPlan(data);
}

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

export const planesService = {
  listar: listarPlanes,
  crear: crearPlan,
  actualizar: actualizarPlan,
  suspender: suspenderPlan,
  observaciones: listarObservaciones,
  observar: crearObservacion,
};
