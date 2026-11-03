import { describe, expect, it } from 'vitest';

import { iniciales, mapUsuario } from './auth';

describe('mapper de usuario', () => {
  it('traduce rol, turno y campos del backend', () => {
    const usuario = mapUsuario({
      id: 3,
      username: 'matrona.diaz',
      email: 'matrona.diaz@pokikoa.cl',
      full_name: 'Matrona Javiera Díaz',
      role: 'nurse',
      shift: 'morning',
      is_active: true,
      is_two_factor_enabled: false,
      is_temporarily_locked: false,
      last_login: null,
      created_at: '2026-11-03T08:00:00-03:00',
      updated_at: '2026-11-03T08:00:00-03:00',
    });
    expect(usuario.rol).toBe('enfermeria');
    expect(usuario.turno).toBe('morning');
    expect(usuario.nombreCompleto).toBe('Matrona Javiera Díaz');
    expect(usuario.iniciales).toBe('MD');
  });

  it('calcula iniciales ignorando tratamientos y paréntesis', () => {
    expect(iniciales('Dr. Martín Soto (Neonatólogo)')).toBe('MS');
    expect(iniciales('QF. Rodrigo Silva')).toBe('RS');
    expect(iniciales('Ana')).toBe('A');
    expect(iniciales('')).toBe('PK');
  });
});
