/**
 * @file plan.ts
 * @description Planes de cuidado y observaciones clínicas por paciente.
 */

export type EstadoPlan = 'Activo' | 'Suspendido' | 'Finalizado';

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

export interface PlanPayload {
  paciente: number;
  areaCuidado: string;
  intervencion: string;
  frecuencia: string;
  estado: EstadoPlan;
}

export type CategoriaObservacion =
  'general' | 'enfermeria' | 'medica' | 'canguro' | 'fototerapia';

export interface Observacion {
  id: number;
  pacienteId: number;
  autor: string;
  categoria: CategoriaObservacion;
  contenido: string;
  creadaEn: string;
}
