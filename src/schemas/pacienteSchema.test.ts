import { describe, expect, it } from 'vitest';

import { pacienteSchema } from './pacienteSchema';

const valido = {
  identificador: 'RN-2026-010',
  nombreCompleto: 'RN Prueba',
  sexo: 'F',
  fechaNacimiento: '2026-10-01',
  edadGestacional: '32.5',
  pesoNacimiento: '1600',
  peso: '',
  diagnostico: '',
  medicoId: '',
  cunaId: '',
};

describe('pacienteSchema', () => {
  it('acepta un ingreso válido y normaliza números vacíos', () => {
    const resultado = pacienteSchema.parse(valido);
    expect(resultado.edadGestacional).toBe(32.5);
    expect(resultado.pesoNacimiento).toBe(1600);
    expect(resultado.peso).toBeUndefined();
    expect(resultado.medicoId).toBeUndefined();
  });

  it('aplica los límites del backend', () => {
    for (const cambio of [
      { edadGestacional: '19' },
      { pesoNacimiento: '150' },
      { pesoNacimiento: '1600.5' },
      { fechaNacimiento: '2999-01-01' },
      { identificador: 'RN' },
    ]) {
      expect(pacienteSchema.safeParse({ ...valido, ...cambio }).success).toBe(
        false
      );
    }
  });
});
