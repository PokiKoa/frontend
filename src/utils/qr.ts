/**
 * @file qr.ts
 * @description URLs de los códigos QR pegados en cada cuna. El QR identifica a
 * la cuna por su código (el mismo de la etiqueta), no al paciente: al
 * escanearlo se abre la ficha de quien la ocupe en ese momento.
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
    throw new Error(`Fallo de aserción en qr: ${mensaje}`);
  }
}

const RUTA_QR_CUNA = '/qr/cuna/';
const PATRON_RUTA = /^\/qr\/cuna\/([^/]+)\/?$/;

/**
 * Origen público que se imprime en los QR sin barra diagonal final.
 * `VITE_PUBLIC_URL` permite fijarlo (por ejemplo, al imprimir desde un computador
 * que usa `localhost`).
 *
 * @returns Origen base normalizado sin `/` al final.
 */
export function origenPublico(): string {
  const configurado = String(import.meta.env.VITE_PUBLIC_URL ?? '').trim();
  return (configurado || window.location.origin).replace(/\/+$/, '');
}

/**
 * Construye la ruta interna canónica de la aplicación para una cuna (p. ej. `/qr/cuna/C-01`).
 *
 * Pre: `codigo` contiene un identificador de cuna no vacío tras recortar espacios.
 * Post: Retorna `/qr/cuna/<codigoCodificado>` con el código escapado mediante `encodeURIComponent`.
 * Invariante: La ruta resultante comienza siempre con `/qr/cuna/` y no contiene segmentos extra.
 */
export function rutaQrCuna(codigo: string): string {
  const limpio = codigo.trim();
  asegurar(limpio.length > 0, 'el código de cuna no puede estar vacío.');

  const ruta = `${RUTA_QR_CUNA}${encodeURIComponent(limpio)}`;

  asegurar(
    PATRON_RUTA.test(ruta),
    'la ruta QR generada debe ajustarse al patrón canónico /qr/cuna/<codigo>.'
  );

  return ruta;
}

/**
 * Construye la URL completa que se codifica en el QR físico de una cuna.
 *
 * Pre: `codigo` es un identificador de cuna no vacío y `origen` es una URL base válida no vacía.
 * Post: Retorna `<origenSinBarraFinal>/qr/cuna/<codigoCodificado>`.
 * Invariante: No duplica barras diagonales entre el origen y la ruta de la cuna.
 */
export function urlQrCuna(codigo: string, origen: string): string {
  const origenLimpio = origen.trim().replace(/\/+$/, '');
  asegurar(origenLimpio.length > 0, 'el origen público no puede estar vacío.');

  return `${origenLimpio}${rutaQrCuna(codigo)}`;
}

/**
 * Extrae el código de cuna de un texto escaneado desde un QR. Acepta la URL de
 * cualquier origen (un QR impreso en otro entorno sigue sirviendo) o la ruta
 * relativa; cualquier otro contenido devuelve `null` para evitar redirecciones externas.
 *
 * Pre: `texto` es la cadena cruda leída por el escáner QR.
 * Post: Retorna el código de cuna decodificado y recortado si el `pathname` coincide
 * con `/qr/cuna/<codigo>`, o `null` ante URLs malformadas, rutas ajenas o códigos vacíos.
 * Invariante: Nunca retorna una URL completa ni cadenas vacías o compuestas solo de espacios.
 */
export function codigoDesdeQr(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  let ruta: string;
  try {
    ruta = new URL(limpio, 'http://poki-koa.local').pathname;
  } catch {
    return null;
  }
  const coincidencia = PATRON_RUTA.exec(ruta);
  if (!coincidencia) return null;
  try {
    const codigo = decodeURIComponent(coincidencia[1]).trim();
    if (!codigo) return null;

    asegurar(
      codigo.trim().length > 0,
      'el código de cuna extraído no puede ser vacío.'
    );

    return codigo;
  } catch {
    return null;
  }
}