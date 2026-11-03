import { describe, expect, it } from 'vitest';

import { rangosDesdeUmbrales, signoEnRango } from './rangos';

const umbrales = {
  id: 1,
  patient: null,
  heart_rate_critical_low: 80,
  heart_rate_warning_low: 100,
  heart_rate_warning_high: 160,
  heart_rate_critical_high: 180,
  spo2_critical_low: 90,
  spo2_warning_low: 95,
  temp_critical_low: '36.0',
  temp_warning_low: '36.5',
  temp_warning_high: '37.5',
  temp_critical_high: '38.5',
  updated_by: null,
  updated_at: '2026-11-03T08:00:00-03:00',
};

describe('rangos vitales', () => {
  const rangos = rangosDesdeUmbrales(umbrales);

  it('usa los umbrales de advertencia del backend', () => {
    expect(rangos.ritmoCardiaco).toEqual({ min: 100, max: 160 });
    expect(rangos.spo2).toEqual({ min: 95, max: 100 });
    expect(rangos.temperatura).toEqual({ min: 36.5, max: 37.5 });
  });

  it('evalúa los límites de forma inclusiva', () => {
    expect(signoEnRango('ritmoCardiaco', 160, rangos)).toBe(true);
    expect(signoEnRango('ritmoCardiaco', 161, rangos)).toBe(false);
    expect(signoEnRango('spo2', 94, rangos)).toBe(false);
    expect(signoEnRango('temperatura', 36.4, rangos)).toBe(false);
  });

  it('no marca fuera de rango sin lectura o sin umbrales', () => {
    expect(signoEnRango('spo2', null, rangos)).toBe(true);
    expect(signoEnRango('spo2', 50, null)).toBe(true);
  });
});
