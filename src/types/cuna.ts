/**
 * @file cuna.ts
 * @description Cunas e incubadoras con su paciente y última lectura (`/monitoring/overview/`).
 */

export type EstadoCuna =
  'disponible' | 'ocupada' | 'mantenimiento' | 'fuera_linea';

export interface Cuna {
  id: number;
  identificador: string;
  nombre: string;
  ubicacion: string;
  estado: EstadoCuna;
  dispositivoActivo: boolean;
  pacienteId: number | null;
  pacienteNombre: string | null;
  pacienteIdentificador: string | null;
  alertasAbiertas: number;
  tieneAlertaCritica: boolean;
  ritmoCardiaco: number | null;
  spo2: number | null;
  temperatura: number | null;
  dormido: boolean | null;
  canulaOk: boolean | null;
  viaIvActiva: boolean | null;
  enMantenimiento: boolean;
  /** Última telemetría recibida (vacío si la cuna nunca transmitió). */
  ultimaActualizacion: string;
}

/** Cuna resuelta desde su código QR, con quien la ocupa en este momento. */
export interface CunaQr {
  id: number;
  identificador: string;
  nombre: string;
  ubicacion: string;
  estado: EstadoCuna;
  pacienteId: number | null;
  pacienteNombre: string | null;
}

/** Estado que recibe la ficha del paciente al abrirse desde el QR de una cuna. */
export interface EstadoNavegacionQr {
  desdeQrCuna: string;
}
