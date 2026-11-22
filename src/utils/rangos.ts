/**
 * @file rangos.ts
 * @description Rangos normales de signos vitales derivados de los umbrales de
 * alerta del backend (fuente única de verdad: vitals/rules.py y la
 * configuración de umbrales). El frontend nunca define rangos propios.
 */

import type { Api } from '@/api/tipos';

/**
 * Verifica una condición de invariante en tiempo de ejecución y lanza un error
 * descriptivo si se rompe.
 *
 * @param condicion - Expresión booleana que debe cumplirse.
 * @param mensaje - Motivo del fallo de aserción.
 */
function asegurar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new Error(`Fallo de aserción en rangos: ${mensaje}`);
  }
}

/** Signos vitales monitorizados continuamente en cada cuna neonatal. */
export type SignoVital = 'ritmoCardiaco' | 'spo2' | 'temperatura';

/** Intervalos fisiológicos normales `[min, max]` por signo vital. */
export type RangosVitales = Record<SignoVital, { min: number; max: number }>;

/**
 * Deriva los rangos fisiológicos sin advertencias a partir de la configuración
 * de umbrales proveniente del backend.
 *
 * Pre: `umbrales` contiene límites numéricos válidos de advertencia baja y alta
 * para frecuencia cardíaca, SpO2 y temperatura corporal.
 * Post: Retorna un objeto `RangosVitales` donde cada signo vital define su intervalo
 * cerrado `[min, max]` (con `spo2.max = 100`).
 * Invariante: Para cada signo vital se cumple `Number.isFinite(min)`, `Number.isFinite(max)`
 * y `min <= max`; además `spo2.min` se mantiene en `[0, 100]`.
 */
export function rangosDesdeUmbrales(
  umbrales: Api['AlertThresholdConfig']
): RangosVitales {
  const rangos: RangosVitales = {
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

  for (const signo of ['ritmoCardiaco', 'spo2', 'temperatura'] as const) {
    const { min, max } = rangos[signo];
    asegurar(
      Number.isFinite(min) && Number.isFinite(max) && min <= max,
      `el rango derivado para ${signo} (${min}..${max}) es inválido.`
    );
  }
  asegurar(
    rangos.spo2.min >= 0 && rangos.spo2.min <= 100,
    'el umbral mínimo de SpO2 debe mantenerse entre 0 y 100.'
  );

  return rangos;
}

/**
 * Indica si una lectura de signo vital está dentro del rango fisiológico normal.
 * Sin lectura (`null`/`undefined`) o sin rangos cargados retorna `true` para evitar
 * falsos positivos visuales sobre datos aún no evaluables.
 *
 * Pre: `tipo` es un `SignoVital` válido; si `valor` está presente debe ser un número finito,
 * y si `rangos` está cargado debe contener intervalos coherentes (`min <= max`).
 * Post: Retorna `true` si `valor` es nulo/indefinido, si `rangos` no está disponible, o si
 * `rangos[tipo].min <= valor <= rangos[tipo].max`; retorna `false` en caso contrario.
 * Invariante: No muta `rangos` ni altera el valor evaluado.
 */
export function signoEnRango(
  tipo: SignoVital,
  valor: number | null | undefined,
  rangos: RangosVitales | null | undefined
): boolean {
  if (valor === null || valor === undefined || !rangos) return true;

  asegurar(
    Number.isFinite(valor),
    `la lectura de ${tipo} debe ser un número finito.`
  );
  const { min, max } = rangos[tipo];
  asegurar(
    Number.isFinite(min) && Number.isFinite(max) && min <= max,
    `el rango configurado para ${tipo} (${min}..${max}) es inválido.`
  );

  return valor >= min && valor <= max;
}
