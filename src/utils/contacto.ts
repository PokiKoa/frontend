/**
 * @file contacto.ts
 * @description RUT y teléfonos chilenos de los padres. Replica las reglas del
 * backend (`patients/validators.py`) para avisar antes de enviar el formulario.
 */

/**
 * Verifica una condición de invariante en tiempo de ejecución y lanza un error
 * descriptivo si se rompe.
 *
 * @param condicion - Expresión booleana que debe cumplirse.
 * @param mensaje - Motivo del fallo de aserción.
 */
function asegurar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new Error(`Fallo de aserción en contacto: ${mensaje}`);
  }
}

/**
 * Calcula el dígito verificador de un RUT chileno mediante el algoritmo módulo 11.
 *
 * Pre: `cuerpo` contiene únicamente dígitos (`0-9`) correspondientes a la parte numérica del RUT.
 * Post: Retorna exactamente un carácter perteneciente al conjunto `{'0'..'9', 'K'}`.
 * Invariante: El algoritmo aplica pesos cíclicos `2..7` de derecha a izquierda sin mutar `cuerpo`.
 */
export function digitoVerificador(cuerpo: string): string {
  asegurar(/^\d+$/.test(cuerpo), 'el cuerpo del RUT debe contener solo dígitos.');

  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);

  asegurar(
    /^[0-9K]$/.test(dv),
    'el dígito verificador calculado debe ser un dígito decimal o "K".'
  );

  return dv;
}

/** Elimina espacios, puntos y guiones, y normaliza la letra `K` a mayúscula. */
function limpiarRut(valor: string): string {
  return valor
    .trim()
    .toUpperCase()
    .replace(/[.\-\s]/g, '');
}

/**
 * Valida si un RUT chileno es vacío (campo opcional) o cumple formato y módulo 11.
 *
 * Pre: `valor` es una cadena ingresada por el usuario (posiblemente vacía o con separadores).
 * Post: Retorna `true` si `valor` está vacío tras limpiar separadores, o si tiene entre
 * 1 y 8 dígitos seguidos de su dígito verificador correcto según `digitoVerificador`.
 * Invariante: No modifica la cadena original `valor`.
 */
export function rutValido(valor: string): boolean {
  const limpio = limpiarRut(valor);
  if (!limpio) return true;
  const coincidencia = /^(\d{1,8})([\dK])$/.exec(limpio);
  if (!coincidencia) return false;
  const cuerpo = coincidencia[1].replace(/^0+/, '') || '0';
  return digitoVerificador(cuerpo) === coincidencia[2];
}

/**
 * Formatea un RUT válido como `12.345.678-5`; si es vacío o inválido lo devuelve sin cambios.
 *
 * @param valor - RUT crudo o parcialmente formateado.
 * @returns RUT con separadores de miles y guion, o `valor` original si no es válido.
 */
export function formatearRut(valor: string): string {
  const limpio = limpiarRut(valor);
  if (!limpio || !rutValido(limpio)) return valor;
  const cuerpo = limpio.slice(0, -1).replace(/^0+/, '') || '0';
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${conPuntos}-${limpio.slice(-1)}`;
}

/**
 * Extrae los 9 dígitos nacionales de un teléfono chileno (aceptando prefijo `+56` o `56`),
 * o retorna `null` si no cumple el formato nacional.
 */
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

/**
 * Verifica si un teléfono está vacío (campo opcional) o corresponde a un número chileno de 9 dígitos.
 *
 * @param valor - Número telefónico ingresado.
 * @returns `true` si está vacío o contiene 9 dígitos nacionales válidos.
 */
export function telefonoValido(valor: string): boolean {
  return !valor.trim() || digitosTelefono(valor) !== null;
}

/**
 * Formatea un número chileno válido como `+56 9 1234 5678` (móvil) o `+56 22 123 4567` (fijo);
 * si no es válido lo devuelve sin cambios.
 *
 * @param valor - Teléfono ingresado.
 * @returns Teléfono formateado según estándar nacional o `valor` original.
 */
export function formatearTelefono(valor: string): string {
  const digitos = digitosTelefono(valor);
  if (!digitos) return valor;
  if (digitos.startsWith('9')) {
    return `+56 9 ${digitos.slice(1, 5)} ${digitos.slice(5)}`;
  }
  return `+56 ${digitos.slice(0, 2)} ${digitos.slice(2, 5)} ${digitos.slice(5)}`;
}