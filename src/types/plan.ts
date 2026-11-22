/**
 * @file plan.ts
 * @description Planes de cuidado y observaciones clínicas por paciente.
 */

export type EstadoPlan = 'Activo' | 'Suspendido' | 'Finalizado';

/** Plan de cuidado clínico asociado a un paciente neonatal. */
export interface PlanCuidado {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  /** Código de la cuna del paciente, o "Sin cuna" (se completa con la lista de pacientes). */
  cuna: string;
  areaCuidado: string;
  intervencion: string;
  frecuencia: string;
  estado: EstadoPlan;
  creadoPor: string;
  creadoEn: string;
}

/** Datos requeridos para crear o actualizar un plan de cuidado. */
export interface PlanPayload {
  /** Identificador numérico del paciente asociado. */
  paciente: number;
  areaCuidado: string;
  intervencion: string;
  frecuencia: string;
  estado: EstadoPlan;
}

export type CategoriaObservacion =
  | 'general'
  | 'enfermeria'
  | 'medica'
  | 'canguro'
  | 'fototerapia';

/** Nota u observación clínica registrada en la evolución del paciente. */
export interface Observacion {
  id: number;
  pacienteId: number;
  autor: string;
  categoria: CategoriaObservacion;
  contenido: string;
  creadaEn: string;
}