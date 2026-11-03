/**
 * @file fechas.test.ts
 * @description Pruebas unitarias del formato de fechas y horas en la zona
 * horaria institucional.
 */

import { describe, expect, it } from 'vitest';

import {
  fechaHoy,
  formatearEdadGestacional,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
  tiempoRelativo,
} from './fechas';

describe('formatearFecha', () => {
  it('formatea una fecha ISO en la zona de la unidad', () => {
    expect(formatearFecha('2026-03-15T12:00:00Z')).toBe('15-03-2026');
  });

  it('no adelanta ni atrasa el día en fechas sin hora', () => {
    expect(formatearFecha('2026-10-28')).toBe('28-10-2026');
    expect(formatearFecha('2026-01-01')).toBe('01-01-2026');
  });

  it('usa el texto por defecto con valores inválidos', () => {
    expect(formatearFecha(null)).toBe('—');
    expect(formatearFecha('no-es-fecha')).toBe('—');
    expect(formatearFecha(null, 'Sin fecha')).toBe('Sin fecha');
  });
});

describe('formatearFechaHora', () => {
  it('incluye día, mes, año y hora', () => {
    const resultado = formatearFechaHora('2026-03-15T13:05:00Z');
    expect(resultado).toContain('15-03-2026');
    expect(resultado).toContain('10:05');
  });
});

describe('formatearHora', () => {
  it('normaliza una hora con segundos', () => {
    expect(formatearHora('08:30:00')).toBe('08:30');
  });

  it('convierte una marca ISO a la hora de Santiago', () => {
    expect(formatearHora('2026-03-15T13:05:00Z')).toBe('10:05');
  });

  it('devuelve el valor por defecto cuando no hay hora', () => {
    expect(formatearHora(null)).toBe('—');
  });
});

describe('tiempoRelativo', () => {
  it('describe lecturas recientes en minutos', () => {
    const haceCincoMinutos = new Date(Date.now() - 5 * 60 * 1000);
    expect(tiempoRelativo(haceCincoMinutos)).toBe('Hace 5 min');
  });

  it('describe el día anterior como "Ayer"', () => {
    const ayer = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(tiempoRelativo(ayer)).toBe('Ayer');
  });

  it('devuelve un marcador sin fecha', () => {
    expect(tiempoRelativo(undefined)).toBe('—');
  });
});

describe('fechaHoy', () => {
  it('devuelve una fecha ISO corta válida', () => {
    expect(fechaHoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('usa la fecha de Santiago y no la de UTC', () => {
    const santiago = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    expect(fechaHoy()).toBe(santiago);
  });
});

describe('formatearEdadGestacional', () => {
  it('expresa semanas y días', () => {
    expect(formatearEdadGestacional(38.5)).toBe('38s 4d');
  });

  it('omite los días cuando no hay fracción', () => {
    expect(formatearEdadGestacional(36)).toBe('36s');
  });

  it('devuelve un marcador si no hay dato', () => {
    expect(formatearEdadGestacional(null)).toBe('—');
  });
});
