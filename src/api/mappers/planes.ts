/**
 * @file planes.ts
 * @description Traducción de planes de cuidado y observaciones clínicas.
 */

import type { Api } from '@/api/tipos';
import type {
  CategoriaObservacion,
  EstadoPlan,
  Observacion,
  PlanCuidado,
  PlanPayload,
} from '@/types/plan';

export const ESTADO_PLAN_DESDE_API: Record<
  Api['CarePlanStatusEnum'],
  EstadoPlan
> = {
  active: 'Activo',
  suspended: 'Suspendido',
  completed: 'Finalizado',
};

export const ESTADO_PLAN_HACIA_API = Object.fromEntries(
  Object.entries(ESTADO_PLAN_DESDE_API).map(([api, ui]) => [ui, api])
) as Record<EstadoPlan, Api['CarePlanStatusEnum']>;

export const CATEGORIA_DESDE_API: Record<
  Api['CategoryEnum'],
  CategoriaObservacion
> = {
  general: 'general',
  nursing: 'enfermeria',
  medical: 'medica',
  kangaroo_care: 'canguro',
  phototherapy: 'fototerapia',
};

export const CATEGORIA_HACIA_API = Object.fromEntries(
  Object.entries(CATEGORIA_DESDE_API).map(([api, ui]) => [ui, api])
) as Record<CategoriaObservacion, Api['CategoryEnum']>;

export const ETIQUETA_CATEGORIA: Record<CategoriaObservacion, string> = {
  general: 'General',
  enfermeria: 'Enfermería',
  medica: 'Médica',
  canguro: 'Contacto piel con piel',
  fototerapia: 'Fototerapia',
};

export function mapPlan(datos: Api['CarePlan']): PlanCuidado {
  return {
    id: datos.id,
    pacienteId: datos.patient,
    pacienteNombre: datos.patient_name,
    cuna: 'Sin cuna',
    areaCuidado: datos.care_area,
    intervencion: datos.intervention,
    frecuencia: datos.frequency,
    estado: ESTADO_PLAN_DESDE_API[datos.status],
    creadoPor: datos.created_by_name,
    creadoEn: datos.created_at,
  };
}

export function mapPlanCreacion(datos: PlanPayload): Api['CarePlanCreate'] {
  return {
    patient_id: datos.paciente,
    care_area: datos.areaCuidado.trim(),
    intervention: datos.intervencion.trim(),
    frequency: datos.frecuencia.trim(),
    status: ESTADO_PLAN_HACIA_API[datos.estado],
  };
}

/** El paciente de un plan no cambia en v2: la edición solo envía su contenido y estado. */
export function mapPlanEdicion(datos: PlanPayload): Api['CarePlanUpdate'] {
  const { patient_id: _paciente, ...cambios } = mapPlanCreacion(datos);
  return cambios;
}

export function mapObservacion(datos: Api['ClinicalObservation']): Observacion {
  return {
    id: datos.id,
    pacienteId: datos.patient,
    autor: datos.author_name,
    categoria: CATEGORIA_DESDE_API[datos.category],
    contenido: datos.content,
    creadaEn: datos.created_at,
  };
}
