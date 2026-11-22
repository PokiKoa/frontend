/**
 * @file calculos.ts
 * @description Cálculos auxiliares de presentación y agregación: edad neonatal,
 * porcentajes acotados, conteos agrupados y truncado de texto.
 */

/**
 * Verifica una condición de invariante en tiempo de ejecución y lanza un error
 * descriptivo si se rompe.
 *
 * @param condicion - Expresión booleana que debe cumplirse.
 * @param mensaje - Motivo del fallo de aserción.
 */
function asegurar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new Error(`Fallo de aserción en calculos: ${mensaje}`);
  }
}

/**
 * Formatea la edad de vida en días, unidad estándar en neonatología.
 * Valores menores a 1 o no finitos se muestran como `'Menos de 1 día'`.
 *
 * @param dias - Días transcurridos desde el nacimiento.
 * @returns Etiqueta legible con concordancia singular/plural.
 */
export function formatearEdadDias(dias: number): string {
  if (!Number.isFinite(dias) || dias < 1) return 'Menos de 1 día';
  return `${dias} día${dias === 1 ? '' : 's'}`;
}

/**
 * Calcula un porcentaje entero redondeado y acotado estrictamente al rango `[0, 100]`.
 *
 * Pre: `parte` y `total` son números finitos.
 * Post: Retorna `0` si `total <= 0` o no es finito; en caso contrario retorna un entero
 * en `[0, 100]` correspondiente a `Math.round((parte / total) * 100)` acotado.
 * Invariante: El resultado nunca es menor a `0` ni mayor a `100`.
 */
export function porcentaje(parte: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const valor = Number.isFinite(parte) ? (parte / total) * 100 : 0;
  const resultado = Math.min(100, Math.max(0, Math.round(valor)));

  asegurar(
    resultado >= 0 && resultado <= 100,
    'el porcentaje calculado debe mantenerse entre 0 y 100.'
  );

  return resultado;
}

/**
 * Cuenta elementos de una colección agrupándolos por una clave derivada.
 *
 * Pre: `elementos` es un arreglo válido y `clave` retorna una clave string o numérica
 * determinista para cada elemento.
 * Post: Retorna un objeto cuyas claves son los valores distintos producidos por `clave`
 * y cuya suma de conteos es exactamente `elementos.length`.
 * Invariante: No muta el arreglo `elementos`.
 */
export function contarPor<T, K extends string | number>(
  elementos: T[],
  clave: (elemento: T) => K
): Record<K, number> {
  const conteos = elementos.reduce(
    (acumulado, elemento) => {
      const valor = clave(elemento);
      acumulado[valor] = (acumulado[valor] ?? 0) + 1;
      return acumulado;
    },
    {} as Record<K, number>
  );

  const totalContado = Object.values<number>(conteos).reduce(
    (acc, n) => acc + n,
    0
  );
  asegurar(
    totalContado === elementos.length,
    'la suma de conteos agrupados debe coincidir con el total de elementos.'
  );

  return conteos;
}

/**
 * Trunca un texto a una longitud máxima agregando `'…'` al final si excede el límite.
 *
 * @param texto - Cadena original.
 * @param maximo - Longitud máxima permitida (por defecto 80).
 * @returns Cadena original si cabe en `maximo`, o recortada con elipsis.
 */
export function truncar(texto: string, maximo = 80): string {
  if (texto.length <= maximo) return texto;
  return `${texto.slice(0, maximo - 1).trimEnd()}…`;
}