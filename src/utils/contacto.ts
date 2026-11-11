/**
 * @file contacto.ts
 * @description RUT y teléfonos chilenos de los padres. Replica las reglas del
 * backend (`patients/validators.py`) para avisar antes de enviar el formulario.
 */

/** Dígito verificador de un RUT (algoritmo módulo 11). */
export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

function limpiarRut(valor: string): string {
  return valor
    .trim()
    .toUpperCase()
    .replace(/[.\-\s]/g, '');
}

/** `true` si el RUT está vacío o tiene formato y dígito verificador correctos. */
export function rutValido(valor: string): boolean {
  const limpio = limpiarRut(valor);
  if (!limpio) return true;
  const coincidencia = /^(\d{1,8})([\dK])$/.exec(limpio);
  if (!coincidencia) return false;
  const cuerpo = coincidencia[1].replace(/^0+/, '') || '0';
  return digitoVerificador(cuerpo) === coincidencia[2];
}

/** Muestra el RUT como `12.345.678-5`; si no es válido lo devuelve tal cual. */
export function formatearRut(valor: string): string {
  const limpio = limpiarRut(valor);
  if (!limpio || !rutValido(limpio)) return valor;
  const cuerpo = limpio.slice(0, -1).replace(/^0+/, '') || '0';
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${conPuntos}-${limpio.slice(-1)}`;
}

/** Los 9 dígitos nacionales del teléfono, o `null` si no es un número chileno válido. */
function digitosTelefono(valor: string): string | null {
  let digitos = valor.trim().replace(/[\s\-().]/g, '');
  if (digitos.startsWith('+')) {
    if (!digitos.startsWith('+56')) return null;
    digitos = digitos.slice(1);
  }
  if (digitos.startsWith('56') && digitos.length === 11) {
    digitos = digitos.slice(2);
  }
  return /^\d{9}$/.test(digitos) ? digitos : null;
}

/** `true` si el teléfono está vacío o es un número chileno de 9 dígitos. */
export function telefonoValido(valor: string): boolean {
  return !valor.trim() || digitosTelefono(valor) !== null;
}

/** Muestra el teléfono como `+56 9 1234 5678` (celular) o `+56 22 123 4567` (fijo). */
export function formatearTelefono(valor: string): string {
  const digitos = digitosTelefono(valor);
  if (!digitos) return valor;
  if (digitos.startsWith('9')) {
    return `+56 9 ${digitos.slice(1, 5)} ${digitos.slice(5)}`;
  }
  return `+56 ${digitos.slice(0, 2)} ${digitos.slice(2, 5)} ${digitos.slice(5)}`;
}
