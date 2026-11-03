import { describe, expect, it } from 'vitest';

import {
  digitoVerificador,
  formatearRut,
  formatearTelefono,
  rutValido,
  telefonoValido,
} from './contacto';

describe('RUT', () => {
  it('calcula el dígito verificador, incluidos K y 0', () => {
    expect(digitoVerificador('12345678')).toBe('5');
    expect(digitoVerificador('10000013')).toBe('K');
    expect(digitoVerificador('1000013')).toBe('0');
  });

  it('valida formatos comunes y rechaza dígitos incorrectos', () => {
    expect(rutValido('')).toBe(true);
    expect(rutValido('12.345.678-5')).toBe(true);
    expect(rutValido('10000013-k')).toBe(true);
    expect(rutValido('12.345.678-9')).toBe(false);
    expect(rutValido('12A45678-5')).toBe(false);
  });

  it('formatea con puntos y guion', () => {
    expect(formatearRut('123456785')).toBe('12.345.678-5');
    expect(formatearRut('10000013-k')).toBe('10.000.013-K');
    expect(formatearRut('invalido')).toBe('invalido');
  });
});

describe('Teléfono', () => {
  it('acepta celulares y fijos chilenos con o sin prefijo', () => {
    expect(telefonoValido('')).toBe(true);
    expect(telefonoValido('+56 9 1234 5678')).toBe(true);
    expect(telefonoValido('56912345678')).toBe(true);
    expect(telefonoValido('(2) 2123 4567')).toBe(true);
    expect(telefonoValido('+54 9 1234 5678')).toBe(false);
    expect(telefonoValido('12345')).toBe(false);
  });

  it('formatea para mostrar', () => {
    expect(formatearTelefono('+56912345678')).toBe('+56 9 1234 5678');
    expect(formatearTelefono('+56221234567')).toBe('+56 22 123 4567');
    expect(formatearTelefono('abc')).toBe('abc');
  });
});
