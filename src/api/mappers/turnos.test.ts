import { describe, expect, it } from 'vitest';

import { mapAsignacion, mapAsignacionPayload, mapTurno } from './turnos';

const turnos = [
  mapTurno({
    value: 'morning',
    label: 'Mañana',
    starts_at: '07:00',
    ends_at: '15:00',
    is_current: false,
  }),
  mapTurno({
    value: 'night',
    label: 'Noche',
    starts_at: '23:00',
    ends_at: '07:00',
    is_current: true,
  }),
];

describe('mapper de turnos', () => {
  it('calcula la duración incluso cuando el turno cruza la medianoche', () => {
    expect(turnos[0].duracionHoras).toBe(8);
    expect(turnos[1].duracionHoras).toBe(8);
    expect(turnos[1].actual).toBe(true);
  });

  it('completa la asignación con el horario del turno y el rol traducido', () => {
    const asignacion = mapAsignacion(
      {
        id: 1,
        user: 3,
        user_name: 'Matrona Javiera Díaz',
        user_role: 'nurse',
        crib: 1,
        crib_code: 'C-01',
        date: '2026-11-03',
        shift: 'night',
        created_by: 1,
        created_at: '',
      },
      turnos
    );
    expect(asignacion.turnoNombre).toBe('Noche');
    expect(asignacion.turnoHoraInicio).toBe('23:00');
    expect(asignacion.usuarioRol).toBe('enfermeria');
    expect(asignacion.usuarioIniciales).toBe('MD');
  });

  it('arma el cuerpo de creación del backend', () => {
    expect(
      mapAsignacionPayload({
        usuario: 3,
        turno: 'morning',
        cuna: 2,
        fecha: '2026-11-03',
      })
    ).toEqual({
      user_id: 3,
      crib_id: 2,
      date: '2026-11-03',
      shift: 'morning',
    });
  });
});
