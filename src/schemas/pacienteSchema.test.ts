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
  madre: { rut: '', nombres: '', apellidos: '', telefono: '' },
  padre: { rut: '', nombres: '', apellidos: '', telefono: '' },
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

  it('valida RUT y teléfono de los padres solo si se completan', () => {
    const conMadre = {
      ...valido,
      madre: {
        rut: '12.345.678-5',
        nombres: 'Ana',
        apellidos: 'Rojas',
        telefono: '+56 9 1234 5678',
      },
    };
    expect(pacienteSchema.safeParse(conMadre).success).toBe(true);
    expect(
      pacienteSchema.safeParse({
        ...valido,
        madre: { ...conMadre.madre, rut: '12.345.678-9' },
      }).success
    ).toBe(false);
    expect(
      pacienteSchema.safeParse({
        ...valido,
        padre: { ...valido.padre, telefono: '1234' },
      }).success
    ).toBe(false);
  });
});
