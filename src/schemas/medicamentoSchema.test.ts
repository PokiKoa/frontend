import { describe, expect, it } from 'vitest';

import { prescripcionSchema } from './medicamentoSchema';

const base = {
  paciente: '3',
  medicamentoId: '1',
  dosis: '5 mg/kg',
  unidadesPorDosis: '1',
  via: 'IV',
  inicio: '2026-11-03T08:00',
  frecuenciaHoras: '',
  fin: '',
};

describe('prescripcionSchema', () => {
  it('acepta una dosis única', () => {
    const datos = prescripcionSchema.parse(base);
    expect(datos.frecuenciaHoras).toBeUndefined();
  });

  it('exige frecuencia si hay término y término posterior al inicio', () => {
    expect(
      prescripcionSchema.safeParse({ ...base, fin: '2026-11-05T08:00' }).success
    ).toBe(false);
    expect(
      prescripcionSchema.safeParse({
        ...base,
        frecuenciaHoras: '8',
        fin: '2026-11-02T08:00',
      }).success
    ).toBe(false);
    expect(
      prescripcionSchema.safeParse({
        ...base,
        frecuenciaHoras: '8',
        fin: '2026-11-05T08:00',
      }).success
    ).toBe(true);
  });

  it('valida el rango de frecuencia del backend', () => {
    expect(
      prescripcionSchema.safeParse({ ...base, frecuenciaHoras: '169' }).success
    ).toBe(false);
  });
});
