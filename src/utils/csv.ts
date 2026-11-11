/**
 * @file csv.ts
 * @description Exportador CSV reutilizable: serializa filas y las descarga en
 * el navegador. Separador `;` (el que espera Excel en es-CL) y BOM UTF-8.
 */

export const CSV_SEPARATOR = ';';

export type CsvCell = string | number | null | undefined;

const NEEDS_QUOTES = /[;"\r\n]/;
// Prefijos que Excel/LibreOffice evalúan como fórmula (inyección CSV)
const FORMULA_PREFIX = /^[=+\-@\t]/;

function serializeCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Serializa filas a CSV.
 *
 * @param rows - Filas de celdas; `null`/`undefined` se exportan vacías.
 * @returns Texto CSV con filas separadas por `\r\n` (sin salto final).
 */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<CsvCell>>): string {
  return rows
    .map((row) => row.map(serializeCell).join(CSV_SEPARATOR))
    .join('\r\n');
}

/**
 * Descarga un texto CSV como archivo en el navegador.
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
