/**
 * @file estados.ts
 * @description Reglas de estado compartidas: qué plan de cuidado está activo y
 * qué indicación médica está vigente. Única fuente para páginas y conteos.
 */

import type { Medicamento } from '@/types/medicamento';
import type { PlanCuidado } from '@/types/plan';

/** Indica si el plan de cuidado sigue activo. */
export function esPlanActivo(plan: Pick<PlanCuidado, 'estado'>): boolean {
  return plan.estado === 'Activo';
}

/** Indica si la indicación médica sigue vigente (pendiente de dosis). */
export function esIndicacionVigente(
  indicacion: Pick<Medicamento, 'estado'>
): boolean {
  return indicacion.estado === 'Vigente';
}

/** Cantidad de planes activos. */
export function contarPlanesActivos(
  planes: ReadonlyArray<Pick<PlanCuidado, 'estado'>>
): number {
  return planes.filter(esPlanActivo).length;
}

/** Cantidad de indicaciones vigentes. */
export function contarIndicacionesVigentes(
  indicaciones: ReadonlyArray<Pick<Medicamento, 'estado'>>
): number {
  return indicaciones.filter(esIndicacionVigente).length;
}
