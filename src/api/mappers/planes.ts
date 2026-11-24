/**
 * @file planes.ts
 * @description Traducción de planes de cuidado y observaciones clínicas entre el backend v2 y la UI.
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

/**
 * Transforma un DTO de plan de cuidado de la API v2 al modelo `PlanCuidado` utilizado en la UI.
 *
 * @param datos - DTO de plan de cuidado recibido desde el backend (`Api['CarePlan']`).
 * @returns Entidad `PlanCuidado` con estado traducido y metadatos de creación.
 */
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

/**
 * Transforma los datos de formulario de un nuevo plan de cuidado al contrato de creación de la API v2.
 *
 * @param datos - Datos capturados en la interfaz (`PlanPayload`).
 * @returns Payload normalizado (`Api['CarePlanCreate']`) con textos recortados y estado traducido.
 */
export function mapPlanCreacion(datos: PlanPayload): Api['CarePlanCreate'] {
  return {
    patient_id: datos.paciente,
    care_area: datos.areaCuidado.trim(),
    intervention: datos.intervencion.trim(),
    frequency: datos.frecuencia.trim(),
    status: ESTADO_PLAN_HACIA_API[datos.estado],
  };
}

/**
 * Construye el payload de actualización parcial de un plan de cuidado para la API v2.
 * El paciente asociado a un plan es inmutable en v2, por lo que se omite `patient_id` y solo se envían su contenido y estado.
 *
 * @param datos - Datos editados del plan (`PlanPayload`).
 * @returns Payload de actualización listo para enviar al backend (`Api['CarePlanUpdate']`).
 */
export function mapPlanEdicion(datos: PlanPayload): Api['CarePlanUpdate'] {
  const { patient_id: _paciente, ...cambios } = mapPlanCreacion(datos);
  return cambios;
}

/**
 * Transforma un DTO de observación clínica de la API v2 al modelo `Observacion` de la UI.
 *
 * @param datos - DTO de observación clínica recibido desde el backend (`Api['ClinicalObservation']`).
 * @returns Entidad `Observacion` con categoría traducida y datos de autoría.
 */
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
