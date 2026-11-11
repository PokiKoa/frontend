/**
 * @file calculos.ts
 * @description Cálculos auxiliares de presentación: iniciales, porcentajes,
 * conteos y evaluación de rangos de signos vitales.
 */

/**
 * Edad en días de vida, la unidad habitual en neonatología.
 *
 * @param dias - Días desde el nacimiento.
 */
export function formatearEdadDias(dias: number): string {
  if (!Number.isFinite(dias) || dias < 1) return 'Menos de 1 día';
  return `${dias} día${dias === 1 ? '' : 's'}`;
}

/**
 * Calcula un porcentaje seguro entre 0 y 100.
 *
 * @param parte - Valor parcial.
 * @param total - Valor total.
 * @returns Porcentaje redondeado o `0` si el total es cero.
 */
export function porcentaje(parte: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((parte / total) * 100)));
}

/**
 * Cuenta elementos agrupándolos por una clave.
 *
 * @param elementos - Colección a agrupar.
 * @param clave - Función que extrae la clave de agrupación.
 * @returns Mapa de clave a cantidad.
 */
export function contarPor<T, K extends string | number>(
  elementos: T[],
  clave: (elemento: T) => K
): Record<K, number> {
  return elementos.reduce(
    (acumulado, elemento) => {
      const valor = clave(elemento);
      acumulado[valor] = (acumulado[valor] ?? 0) + 1;
      return acumulado;
    },
    {} as Record<K, number>
  );
}

/**
 * Trunca un texto a una longitud máxima agregando puntos suspensivos.
 *
 * @param texto - Texto original.
 * @param maximo - Longitud máxima.
 * @returns Texto truncado.
 */
export function truncar(texto: string, maximo = 80): string {
  if (texto.length <= maximo) return texto;
  return `${texto.slice(0, maximo - 1).trimEnd()}…`;
}
