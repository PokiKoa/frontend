import { describe, expect, it } from 'vitest';

import {
  describirEsquema,
  mapCatalogoPayload,
  mapPrescripcion,
  mapPrescripcionPayload,
} from './medicamentos';

const cruda = {
  id: 1,
  patient: 3,
  patient_name: 'RN',
  medication: 2,
  medication_name: 'Cafeína',
  medication_unit: 'ampolla',
  prescribed_by: 5,
  prescribed_by_name: 'Dr. Soto',
  dose: '5 mg/kg',
  units_per_administration: 1,
  route: 'IV' as const,
  starts_at: '2026-11-03T08:00:00-03:00',
  frequency_hours: 24,
  ends_at: null,
  status: 'active' as const,
  next_dose_at: '2026-11-03T08:00:00-03:00',
  is_overdue: true,
  last_administered_slot: null,
  administrations_count: 0,
  cancelled_at: null,
  cancellation_reason: '',
  created_at: '',
  updated_at: '',
};

describe('mapper de medicamentos', () => {
  it('traduce la indicación con su esquema de dosis', () => {
    const indicacion = mapPrescripcion(cruda);
    expect(indicacion.estado).toBe('Vigente');
    expect(indicacion.atrasada).toBe(true);
    expect(describirEsquema(indicacion)).toBe('Cada 24 h');
    expect(describirEsquema({ ...indicacion, frecuenciaHoras: null })).toBe(
      'Dosis única'
    );
  });

  it('envía fechas con zona y omite el término en dosis única', () => {
    const payload = mapPrescripcionPayload({
      paciente: 3,
      medicamentoId: 2,
      dosis: ' 5 mg ',
      unidadesPorDosis: 1,
      via: 'IV',
      inicio: '2026-11-03T08:00',
      frecuenciaHoras: null,
      fin: '2026-11-05T08:00',
    });
    expect(payload.starts_at).toMatch(/Z$/);
    expect(payload.ends_at).toBeNull();
    expect(payload.dose).toBe('5 mg');
  });

  it('serializa la concentración como decimal de dos cifras', () => {
    expect(
      mapCatalogoPayload({
        nombre: 'X',
        principioActivo: 'Y',
        dosisMg: 20,
        unidad: 'vial',
        stock: 3,
        stockMinimo: 5,
        activo: true,
      }).concentration_mg
    ).toBe('20.00');
  });
});
