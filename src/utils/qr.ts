/**
 * @file qr.ts
 * @description URLs de los códigos QR pegados en cada cuna. El QR identifica a
 * la cuna por su código (el mismo de la etiqueta), no al paciente: al
 * escanearlo se abre la ficha de quien la ocupe en ese momento.
 */

const RUTA_QR_CUNA = '/qr/cuna/';
const PATRON_RUTA = /^\/qr\/cuna\/([^/]+)\/?$/;

/**
 * Origen público que se imprime en los QR. `VITE_PUBLIC_URL` permite fijarlo
 * (por ejemplo, al imprimir desde un computador que usa `localhost`).
 */
export function origenPublico(): string {
  const configurado = String(import.meta.env.VITE_PUBLIC_URL ?? '').trim();
  return (configurado || window.location.origin).replace(/\/+$/, '');
}

/** Ruta interna de la app para una cuna, por ejemplo `/qr/cuna/C-01`. */
export function rutaQrCuna(codigo: string): string {
  return `${RUTA_QR_CUNA}${encodeURIComponent(codigo.trim())}`;
}

/** URL completa que se codifica en el QR de una cuna. */
export function urlQrCuna(codigo: string, origen: string): string {
  return `${origen.replace(/\/+$/, '')}${rutaQrCuna(codigo)}`;
}

/**
 * Extrae el código de cuna de un texto escaneado. Acepta la URL de cualquier
 * origen (un QR impreso en otro entorno sigue sirviendo) o la ruta relativa;
 * cualquier otro contenido devuelve `null`, así el lector nunca abre enlaces
 * externos.
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
    return codigo || null;
  } catch {
    return null;
  }
}
