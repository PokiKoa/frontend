/**
 * @file fechas.ts
 * @description Utilidades de formato de fechas y horas en español (es-CL) en la zona horaria de la unidad (America/Santiago),
 * usadas por tablas, fichas clínicas y la bitácora.
 */

/** Zona horaria institucional usada en toda la interfaz. */
const ZONA = 'America/Santiago';

/** Fecha sin hora (`YYYY-MM-DD`) tal como la serializa Django para `DateField`. */
const SOLO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte un valor de fecha en `Date` válido.
 *
 * Las fechas sin hora se interpretan al mediodía local. Si se interpretaran
 * como medianoche UTC, al formatearlas en Lima (UTC-5) retrocederían un día.
 *
 * @param valor - Fecha ISO, marca de tiempo o `Date`.
 * @returns Instancia de `Date` o `null` si el valor no es válido.
 */
function aFecha(valor: string | Date | null | undefined): Date | null {
  if (!valor) return null;

  if (typeof valor === 'string') {
    const soloDia = valor.trim().match(SOLO_DIA);
    if (soloDia) {
      return new Date(
        Number(soloDia[1]),
        Number(soloDia[2]) - 1,
        Number(soloDia[3]),
        12
      );
    }
  }

  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Formatea una fecha como `dd-mm-aaaa`.
 *
 * @param valor - Fecha a formatear.
 * @param porDefecto - Texto devuelto cuando no hay fecha.
 * @returns Fecha legible.
 */
export function formatearFecha(
  valor: string | Date | null | undefined,
  porDefecto = '—'
): string {
  const cadena = typeof valor === 'string' ? valor.trim() : '';
  const soloDia = cadena.match(SOLO_DIA);

  if (soloDia) {
    return `${soloDia[3]}-${soloDia[2]}-${soloDia[1]}`;
  }

  const fecha = aFecha(valor);
  if (!fecha) return porDefecto;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ZONA,
  }).format(fecha);
}

/**
 * Formatea una fecha y hora como `dd-mm-aaaa HH:mm`.
 *
 * @param valor - Fecha a formatear.
 * @param porDefecto - Texto devuelto cuando no hay fecha.
 * @returns Fecha y hora legibles.
 */
export function formatearFechaHora(
  valor: string | Date | null | undefined,
  porDefecto = '—'
): string {
  const fecha = aFecha(valor);
  if (!fecha) return porDefecto;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA,
  }).format(fecha);
}

/**
 * Formatea solo la hora como `HH:mm`.
 *
 * @param valor - Fecha u hora a formatear.
 * @param porDefecto - Texto devuelto cuando no hay hora.
 * @returns Hora legible.
 */
export function formatearHora(
  valor: string | Date | null | undefined,
  porDefecto = '—'
): string {
  if (typeof valor === 'string') {
    const coincidencia = valor.match(/^(\d{2}):(\d{2})/);
    if (coincidencia) return `${coincidencia[1]}:${coincidencia[2]}`;
  }

  const fecha = aFecha(valor);
  if (!fecha) return porDefecto;
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA,
  }).format(fecha);
}

/**
 * Describe una fecha en lenguaje natural (`Hace 5 min`, `Ayer`, etc.).
 *
 * @param valor - Fecha de referencia.
 * @returns Descripción relativa o fecha completa si supera una semana.
 */
export function tiempoRelativo(
  valor: string | Date | null | undefined
): string {
  const fecha = aFecha(valor);
  if (!fecha) return '—';

  const diferencia = Date.now() - fecha.getTime();
  const minutos = Math.floor(diferencia / 60000);

  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;

  return formatearFecha(fecha);
}

/**
 * Devuelve la fecha de hoy en la zona horaria institucional, en formato ISO
 * corto (`YYYY-MM-DD`). Se evita `toISOString()` porque devuelve la fecha en
 * UTC y, de noche en Lima, adelantaría un día respecto al backend.
 *
 * @returns Fecha actual de la unidad sin hora.
 */
export function fechaHoy(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const valor = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/**
 * Calcula la edad gestacional legible a partir de semanas y días.
 *
 * @param semanas - Semanas de gestación.
 * @param dias - Días adicionales.
 * @returns Texto como `38s 4d`.
 */
export function formatearEdadGestacional(
  semanas: number | null | undefined
): string {
  if (semanas === null || semanas === undefined) return '—';
  const enteras = Math.floor(semanas);
  const dias = Math.round((semanas - enteras) * 7);
  return dias > 0 ? `${enteras}s ${dias}d` : `${enteras}s`;
}
