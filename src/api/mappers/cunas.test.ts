import { describe, expect, it } from 'vitest';

import { aplicarEventoCunas, resumirCunas } from '@/services/cunasService';

import { mapCuna } from './cunas';

const lectura = {
  id: 1,
  crib: 1,
  crib_code: 'C-01',
  patient: 7,
  patient_name: 'RN',
  heart_rate: 140,
  spo2: 97,
  temperature: '36.8',
  sleep_state: 'asleep' as const,
  cannula_connected: true,
  iv_line_active: true,
  recorded_at: '2026-11-03T10:00:00-03:00',
  ingested_at: '',
};

function cunaCruda(overrides = {}) {
  return {
    id: 1,
    code: 'C-01',
    name: 'Incubadora 1',
    location: 'UCI A',
    status: 'occupied' as const,
    api_key_prefix: 'pk_dev_x',
    is_device_active: true,
    last_telemetry_at: '2026-11-03T09:59:00-03:00',
    current_patient_id: 7,
    current_patient_name: 'RN',
    current_patient_mrn: 'RN-1',
    created_at: '',
    updated_at: '',
    patient: {
      id: 7,
      medical_record_number: 'RN-1',
      full_name: 'RN Mateo',
      sex: 'M' as const,
      age_days: 4,
      gestational_age_weeks: '31.5',
      current_weight_g: 1500,
    },
    latest_reading: lectura,
    open_alerts: { total: 0, critical: 0, warning: 0, info: 0 },
    highest_open_severity: null,
    ...overrides,
  };
}

describe('cunas', () => {
  it('mapea la cuna del resumen con su última lectura', () => {
    const cuna = mapCuna(cunaCruda());
    expect(cuna.estado).toBe('ocupada');
    expect(cuna.pacienteIdentificador).toBe('RN-1');
    expect(cuna.temperatura).toBe(36.8);
    expect(cuna.ultimaActualizacion).toBe(lectura.recorded_at);
  });

  it('cuenta las cunas fuera de línea', () => {
    const cunas = [
      mapCuna(cunaCruda()),
      mapCuna(
        cunaCruda({
          id: 2,
          status: 'offline',
          patient: null,
          latest_reading: null,
        })
      ),
    ];
    expect(resumirCunas(cunas)).toEqual({
      disponible: 0,
      ocupada: 1,
      mantenimiento: 0,
      fuera_linea: 1,
    });
  });

  it('aplica lecturas en memoria y pide recarga cuando cambian las alertas', () => {
    const cunas = [mapCuna(cunaCruda())];
    const nueva = { ...lectura, heart_rate: 150 };
    const evento = {
      event: 'telemetry.reading',
      crib_id: 1,
      reading: nueva,
      active_alerts: [],
      auto_resolved_alerts: [],
    };
    expect(aplicarEventoCunas(cunas, evento)?.[0].ritmoCardiaco).toBe(150);

    const conAlerta = {
      ...evento,
      active_alerts: [{ id: 9, severity: 'critical' }],
    };
    expect(aplicarEventoCunas(cunas, conAlerta)).toBeNull();
    expect(
      aplicarEventoCunas(cunas, { event: 'alert.resolved', alert: {} })
    ).toBeNull();
    expect(aplicarEventoCunas(cunas, { event: 'stream.connected' })).toBe(
      cunas
    );
  });
});
