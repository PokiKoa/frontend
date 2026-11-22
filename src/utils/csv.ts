/**
 * @file csv.ts
 * @description Exportador CSV reutilizable: serializa filas y las descarga en
 * el navegador. Separador `;` (el que espera Excel en es-CL) y BOM UTF-8.
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
    throw new Error(`Fallo de aserción en csv: ${mensaje}`);
  }
}

/** Separador de columnas esperado por Excel en configuración regional `es-CL`. */
export const CSV_SEPARATOR = ';';

/** Tipos de valores aceptados por celda antes de su serialización a texto. */
export type CsvCell = string | number | null | undefined;

const NEEDS_QUOTES = /[;"\r\n]/;
/** Prefijos que Excel o LibreOffice evalúan como fórmula (mitigación de CSV Injection). */
const FORMULA_PREFIX = /^[=+\-@\t]/;

/**
 * Serializa una celda individual neutralizando posibles fórmulas y escapando
 * separadores, comillas o saltos de línea según RFC 4180.
 *
 * Pre: `value` es `string`, `number`, `null` o `undefined`.
 * Post: Retorna `''` para valores nulos/indefinidos; si `value` era `string` con prefijo de
 * fórmula (`=`, `+`, `-`, `@`, `\t`), antepone `'` para neutralizar su ejecución; y si
 * contiene `;`, `"`, `\r` o `\n`, la envuelve en comillas dobles duplicando comillas internas.
 * Invariante: Ninguna celda resultante comienza directamente con un carácter de fórmula sin escapar.
 */
function serializeCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  const resultado = NEEDS_QUOTES.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;

  asegurar(
    typeof value !== 'string' || !FORMULA_PREFIX.test(resultado),
    'una celda de texto no debe comenzar con un prefijo de fórmula sin neutralizar.'
  );

  return resultado;
}

/**
 * Serializa una matriz de filas a formato CSV compatible con Excel `es-CL`
 * (`null` y `undefined` se exportan como celdas vacías).
 *
 * Pre: `rows` es una colección bidimensional de celdas `CsvCell`.
 * Post: Retorna un texto con exactamente `rows.length` líneas (o `''` si `rows` está vacío),
 * separadas por `\r\n` sin salto final y con columnas delimitadas por `;`.
 * Invariante: No muta la matriz `rows` ni ninguna de sus filas internas.
 */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<CsvCell>>): string {
  const resultado = rows
    .map((row) => row.map(serializeCell).join(CSV_SEPARATOR))
    .join('\r\n');

  asegurar(
    rows.length === 0 || !resultado.endsWith('\r\n'),
    'el texto CSV serializado no debe terminar con un salto de línea adicional.'
  );

  return resultado;
}

/**
 * Descarga un texto CSV como archivo en el navegador anteponiendo BOM UTF-8 (`\uFEFF`)
 * para preservar tildes y caracteres latinos en Excel.
 *
 * @param content - Texto generado con {@link toCsv}.
 * @param filename - Nombre del archivo, p. ej. `reporte.csv`.
 * @throws Error si el nombre está vacío.
 */
export function downloadCsv(content: string, filename: string): void {
  if (!filename.trim()) {
    throw new Error('El nombre del archivo CSV es obligatorio.');
  }
  // BOM para que Excel reconozca UTF-8 (tildes y ñ)
  const file = new Blob(['\uFEFF', content], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}