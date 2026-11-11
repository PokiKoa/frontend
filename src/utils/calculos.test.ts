/**
 * @file calculos.test.ts
 * @description Pruebas unitarias de los cálculos de presentación y de la
 * evaluación de rangos de signos vitales.
 */

import { describe, expect, it } from 'vitest';

import { contarPor, formatearEdadDias, porcentaje, truncar } from './calculos';

describe('formatearEdadDias', () => {
  it('expresa la edad en días de vida', () => {
    expect(formatearEdadDias(4)).toBe('4 días');
    expect(formatearEdadDias(1)).toBe('1 día');
    expect(formatearEdadDias(0)).toBe('Menos de 1 día');
  });
});

describe('porcentaje', () => {
  it('redondea la proporción entre parte y total', () => {
    expect(porcentaje(1, 3)).toBe(33);
  });

  it('acota el resultado al rango 0–100', () => {
    expect(porcentaje(5, 2)).toBe(100);
    expect(porcentaje(-5, 10)).toBe(0);
  });

  it('devuelve 0 cuando el total no es positivo', () => {
    expect(porcentaje(3, 0)).toBe(0);
  });
});

describe('contarPor', () => {
  it('agrupa los elementos por la clave indicada', () => {
    const datos = [
      { estado: 'activo' },
      { estado: 'activo' },
      { estado: 'alta' },
    ];
    expect(contarPor(datos, (item) => item.estado)).toEqual({
      activo: 2,
      alta: 1,
    });
  });

  it('devuelve un objeto vacío con una colección vacía', () => {
    expect(contarPor([], () => 'x')).toEqual({});
  });
});

describe('truncar', () => {
  it('deja intacto el texto que cabe en el máximo', () => {
    expect(truncar('Poki Koa', 20)).toBe('Poki Koa');
  });

  it('recorta y agrega puntos suspensivos cuando excede el máximo', () => {
    const resultado = truncar('Monitoreo neonatal intensivo', 12);
    expect(resultado).toHaveLength(12);
    expect(resultado.endsWith('…')).toBe(true);
  });
});
