/**
 * @file rangos.ts
 * @description Rangos normales de signos vitales derivados de los umbrales de
 * alerta del backend (fuente única de verdad: vitals/rules.py y la
 * configuración de umbrales). El frontend nunca define rangos propios.
 */

import type { Api } from '@/api/tipos';

export type SignoVital = 'ritmoCardiaco' | 'spo2' | 'temperatura';

export type RangosVitales = Record<SignoVital, { min: number; max: number }>;

/** Rango sin advertencias: entre los umbrales de advertencia bajo y alto. */
export function rangosDesdeUmbrales(
  umbrales: Api['AlertThresholdConfig']
): RangosVitales {
  return {
    ritmoCardiaco: {
      min: umbrales.heart_rate_warning_low,
      max: umbrales.heart_rate_warning_high,
    },
    spo2: { min: umbrales.spo2_warning_low, max: 100 },
    temperatura: {
      min: Number(umbrales.temp_warning_low),
      max: Number(umbrales.temp_warning_high),
    },
  };
}

/**
 * Indica si una lectura está en rango. Sin lectura o sin rangos cargados se
 * considera en rango para no marcar en rojo datos que no se pudieron evaluar.
 */
export function signoEnRango(
  tipo: SignoVital,
  valor: number | null | undefined,
  rangos: RangosVitales | null | undefined
): boolean {
  if (valor === null || valor === undefined || !rangos) return true;
  return valor >= rangos[tipo].min && valor <= rangos[tipo].max;
}
