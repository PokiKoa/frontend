/**
 * @file csv.test.ts
 * @description Contrato del exportador CSV reutilizable (`toCsv` y `downloadCsv`).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { CSV_SEPARATOR, downloadCsv, toCsv } from './csv';

describe('toCsv', () => {
  it('une celdas con punto y coma y filas con CRLF', () => {
    expect(
      toCsv([
        ['a', 1],
        ['b', 2],
      ])
    ).toBe('a;1\r\nb;2');
    expect(CSV_SEPARATOR).toBe(';');
  });

  it('devuelve una cadena vacía sin filas', () => {
    expect(toCsv([])).toBe('');
  });

  it('representa null y undefined como celdas vacías', () => {
    expect(toCsv([['x', null, undefined, 0]])).toBe('x;;;0');
  });

  it('entrecomilla celdas con separador, comillas o saltos de línea', () => {
    expect(toCsv([['A;"B"', 'línea\nnueva', 'r\rx']])).toBe(
      '"A;""B""";"línea\nnueva";"r\rx"'
    );
  });

  it('neutraliza textos que una planilla interpretaría como fórmula', () => {
    expect(toCsv([['=1+1', '+5', '-x', '@SUM(A1)']])).toBe(
      "'=1+1;'+5;'-x;'@SUM(A1)"
    );
  });

  it('no altera números negativos', () => {
    expect(toCsv([[-3, -0.5]])).toBe('-3;-0.5');
  });
});

describe('downloadCsv', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('descarga el contenido con BOM UTF-8 y libera la URL', async () => {
    const link = { href: '', download: '', click: vi.fn() };
    const createObjectURL = vi.fn(() => 'blob:poki');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('document', { createElement: vi.fn(() => link) });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    downloadCsv('a;b', 'reporte.csv');

    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // TextDecoder descarta el BOM: se verifica en bytes (EF BB BF)
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes)).toBe('a;b');
    expect(link.download).toBe('reporte.csv');
    expect(link.href).toBe('blob:poki');
    expect(link.click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:poki');
  });

  it('rechaza un nombre de archivo vacío', () => {
    expect(() => downloadCsv('a', '  ')).toThrow(
      'El nombre del archivo CSV es obligatorio.'
    );
  });
});
