import { describe, expect, it } from 'vitest';

import { aplicarEventoAlertas } from '@/services/alertasService';

import { mapAlerta } from './alertas';

function cruda(id: number, overrides = {}) {
  return {
    id,
    crib: 1,
    crib_code: 'C-01',
    patient: 7,
    patient_name: 'RN',
    alert_type: 'spo2' as const,
    severity: 'critical' as const,
    status: 'active' as const,
    message: 'SpO2 baja',
    measured_value: '84.00',
    threshold_value: '90.00',
    occurrence_count: 1,
    triggered_at: `2026-11-03T10:0${id}:00-03:00`,
    last_evaluated_at: '',
    acknowledged_by: null,
    acknowledged_by_name: '',
    acknowledged_at: null,
    resolved_by: null,
    resolved_by_name: '',
    resolved_at: null,
    resolution_reason: null,
    ...overrides,
  };
}

describe('alertas', () => {
  it('mapea severidad, tipo, estado y valores decimales', () => {
    const alerta = mapAlerta(
      cruda(1, { alert_type: 'sensor_fault', status: 'acknowledged' })
    );
    expect(alerta.nivel).toBe('Critica');
    expect(alerta.tipo).toBe('fallo_sensor');
    expect(alerta.estado).toBe('reconocida');
    expect(alerta.activa).toBe(true);
    expect(alerta.valorLeido).toBe(84);
  });

  it('agrega, actualiza y quita alertas según los eventos del canal', () => {
    let lista = aplicarEventoAlertas([], {
      event: 'telemetry.reading',
      active_alerts: [cruda(1), cruda(2)],
      auto_resolved_alerts: [],
    });
    expect(lista.map((a) => a.id)).toEqual([2, 1]);

    lista = aplicarEventoAlertas(lista, {
      event: 'alert.acknowledged',
      alert: cruda(1, { status: 'acknowledged' }),
    });
    expect(lista.find((a) => a.id === 1)?.estado).toBe('reconocida');

    lista = aplicarEventoAlertas(lista, {
      event: 'telemetry.reading',
      active_alerts: [],
      auto_resolved_alerts: [cruda(2)],
    });
    expect(lista.map((a) => a.id)).toEqual([1]);

    lista = aplicarEventoAlertas(lista, {
      event: 'alert.resolved',
      alert: cruda(1, { status: 'resolved' }),
    });
    expect(lista).toEqual([]);
  });

  it('devuelve la misma lista cuando el evento no la cambia', () => {
    const lista = [mapAlerta(cruda(1))];
    expect(
      aplicarEventoAlertas(lista, {
        event: 'telemetry.reading',
        active_alerts: [],
        auto_resolved_alerts: [],
      })
    ).toBe(lista);
    expect(aplicarEventoAlertas(lista, { event: 'stream.connected' })).toBe(
      lista
    );
  });
});
