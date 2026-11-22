/**
 * @file estados.ts
 * @description Reglas de estado compartidas: qué plan de cuidado está activo y
 * qué indicación médica está vigente. Única fuente para páginas y conteos.
 */

import type { Medicamento } from '@/types/medicamento';
import type { PlanCuidado } from '@/types/plan';

/**
 * Verifica una condición de invariante en tiempo de ejecución y lanza un error
 * descriptivo si se rompe.
 *
 * @param condicion - Expresión booleana que debe cumplirse.
 * @param mensaje - Motivo del fallo de aserción.
 */
function asegurar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new Error(`Fallo de aserción en estados: ${mensaje}`);
  }
}

/**
 * Determina si un plan de cuidado clínico se encuentra activo.
 *
 * Pre: `plan` contiene un campo `estado` perteneciente a `EstadoPlan`.
 * Post: Retorna `true` exclusivamente cuando `plan.estado === 'Activo'`.
 * Invariante: No muta el objeto `plan`.
 */
export function esPlanActivo(plan: Pick<PlanCuidado, 'estado'>): boolean {
  return plan.estado === 'Activo';
}

/**
 * Determina si una indicación médica sigue vigente (con dosis pendientes por administrar).
 *
 * Pre: `indicacion` contiene un campo `estado` perteneciente a `EstadoPrescripcion`.
 * Post: Retorna `true` exclusivamente cuando `indicacion.estado === 'Vigente'`.
 * Invariante: No muta el objeto `indicacion`.
 */
export function esIndicacionVigente(
  indicacion: Pick<Medicamento, 'estado'>
): boolean {
  return indicacion.estado === 'Vigente';
}

/**
 * Cuenta cuántos planes de cuidado de la colección se encuentran activos.
 *
 * Pre: `planes` es una colección válida de planes con estado clínico definido.
 * Post: Retorna un entero en `[0, planes.length]` igual al total de elementos que
 * satisfacen {@link esPlanActivo}.
 * Invariante: No muta la colección `planes` ni ninguno de sus elementos.
 */
export function contarPlanesActivos(
  planes: ReadonlyArray<Pick<PlanCuidado, 'estado'>>
): number {
  const total = planes.filter(esPlanActivo).length;

  asegurar(
    total >= 0 && total <= planes.length,
    'el conteo de planes activos no puede ser negativo ni superar el total evaluado.'
  );

  return total;
}

/**
 * Cuenta cuántas indicaciones médicas de la colección siguen vigentes.
 *
 * Pre: `indicaciones` es una colección válida de prescripciones con estado definido.
 * Post: Retorna un entero en `[0, indicaciones.length]` igual al total de elementos que
 * satisfacen {@link esIndicacionVigente}.
 * Invariante: No muta la colección `indicaciones` ni ninguno de sus elementos.
 */
export function contarIndicacionesVigentes(
  indicaciones: ReadonlyArray<Pick<Medicamento, 'estado'>>
): number {
  const total = indicaciones.filter(esIndicacionVigente).length;

  asegurar(
    total >= 0 && total <= indicaciones.length,
    'el conteo de indicaciones vigentes no puede ser negativo ni superar el total evaluado.'
  );

  return total;
}