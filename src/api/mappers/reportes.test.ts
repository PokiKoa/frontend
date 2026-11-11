import { describe, expect, it } from 'vitest';

import { reporteACsv } from '@/services/reportesService';

import { mapReporte, mapSerie } from './reportes';

const resumen = {
  generated_at: '2026-11-03T10:00:00-03:00',
  patients: { total: 5, active: 3, discharged: 2 },
  cribs: {
    total: 4,
    by_status: { available: 1, occupied: 2, maintenance: 0, offline: 1 },
    occupancy_percent: 50,
  },
  prescriptions: {
    by_status: { active: 4, completed: 1 },
    administrations_today: 6,
  },
  medications_low_stock: 1,
  alerts: {
    open: 3,
    open_by_severity: { critical: 1, warning: 2 },
    open_by_type: { spo2: 2, heart_rate: 1 },
  },
  care_plans_active: 2,
  staff: {
    active: 7,
    by_shift: { morning: 3 },
    assignments_current_shift_day: 4,
  },
};
const turnos = [
  {
    value: 'morning' as const,
    label: 'Mañana',
    starts_at: '07:00',
    ends_at: '15:00',
    is_current: true,
  },
  {
    value: 'night' as const,
    label: 'Noche',
    starts_at: '23:00',
    ends_at: '07:00',
    is_current: false,
  },
];

describe('mapper de reportes', () => {
  it('traduce resumen y distribuciones', () => {
    const { resumen: r, distribucion: d } = mapReporte(resumen, turnos);
    expect(r.cunasFueraDeLinea).toBe(1);
    expect(r.medicamentosPendientes).toBe(4);
    expect(r.totalMedicamentos).toBe(5);
    expect(r.alertasCriticas).toBe(1);
    expect(r.turnosActivos).toBe(2);
    expect(d.alertas[0]).toEqual({
      tipo: 'spo2',
      etiqueta: 'Saturación (SpO₂)',
      cantidad: 2,
    });
    expect(d.medicamentos).toContainEqual({
      estado: 'Canceladas',
      cantidad: 0,
    });
    expect(d.personal).toEqual([
      { turno: 'Mañana', cantidad: 3, horaInicio: '07:00', horaFin: '15:00' },
      { turno: 'Noche', cantidad: 0, horaInicio: '23:00', horaFin: '07:00' },
    ]);
  });

  it('genera un CSV con separador punto y coma y escapa comillas', () => {
    const reporte = mapReporte(resumen, turnos);
    const csv = reporteACsv(
      reporte,
      mapSerie([{ date: '2026-11-03', admissions: 2, alerts: 5 }])
    );
    const lineas = csv.split('\r\n');
    expect(lineas[0]).toBe('Sección;Indicador;Valor');
    expect(lineas).toContain('Ingresos por día;2026-11-03;2');
    expect(
      reporteACsv(
        {
          ...reporte,
          distribucion: {
            ...reporte.distribucion,
            personal: [
              { turno: 'A;"B"', cantidad: 1, horaInicio: '', horaFin: '' },
            ],
          },
        },
        null
      )
    ).toContain('"A;""B"""');
  });

  it('conserva el contenido completo del consolidado CSV', () => {
    const csv = reporteACsv(
      mapReporte(resumen, turnos),
      mapSerie([{ date: '2026-11-03', admissions: 2, alerts: 5 }])
    );
    expect(csv).toMatchSnapshot();
  });
});
