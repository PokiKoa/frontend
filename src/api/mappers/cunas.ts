/**
 * @file cunas.ts
 * @description Traducción de las cunas del resumen de la unidad del backend v2 hacia los modelos de UI.
 */

import { decimal } from '@/api/mappers/alertas';
import type { Api } from '@/api/tipos';
import type { Cuna, CunaQr, EstadoCuna } from '@/types/cuna';

export const ESTADO_CUNA_DESDE_API: Record<Api['CribStatusEnum'], EstadoCuna> =
  {
    available: 'disponible',
    occupied: 'ocupada',
    maintenance: 'mantenimiento',
    offline: 'fuera_linea',
  };

export const ETIQUETA_ESTADO_CUNA: Record<EstadoCuna, string> = {
  disponible: 'Disponible',
  ocupada: 'Ocupada',
  mantenimiento: 'Mantenimiento',
  fuera_linea: 'Fuera de línea',
};

/**
 * Combina de forma inmutable una lectura de signos vitales sobre una entidad `Cuna` ya mapeada.
 *
 * @param cuna - Entidad `Cuna` base a actualizar.
 * @param lectura - Lectura de telemetría recibida desde el backend (`Api['VitalSignReading']`).
 * @returns Nueva instancia de `Cuna` con los signos vitales, estado de dispositivos y marca temporal actualizados.
 */
export function aplicarLectura(
  cuna: Cuna,
  lectura: Api['VitalSignReading']
): Cuna {
  return {
    ...cuna,
    ritmoCardiaco: lectura.heart_rate,
    spo2: lectura.spo2,
    temperatura: decimal(lectura.temperature),
    dormido: lectura.sleep_state === 'asleep',
    canulaOk: lectura.cannula_connected,
    viaIvActiva: lectura.iv_line_active,
    ultimaActualizacion: lectura.recorded_at,
  };
}

/**
 * Transforma un DTO de cuna básico de la API v2 al modelo reducido `CunaQr` usado en vistas de escaneo/identificación.
 *
 * @param datos - DTO de cuna proveniente del backend (`Api['Crib']`).
 * @returns Entidad `CunaQr` normalizada con estado traducido y datos del paciente actual si está ocupada.
 */
export function mapCunaQr(datos: Api['Crib']): CunaQr {
  return {
    id: datos.id,
    identificador: datos.code,
    nombre: datos.name,
    ubicacion: datos.location,
    estado: ESTADO_CUNA_DESDE_API[datos.status],
    pacienteId: datos.current_patient_id ?? null,
    pacienteNombre: datos.current_patient_name || null,
  };
}

/**
 * Transforma el resumen completo de una cuna (`CribOverview`) de la API v2 al modelo `Cuna` de monitoreo.
 * Si incluye una lectura reciente (`latest_reading`), la aplica automáticamente sobre los valores iniciales nulos.
 *
 * @param datos - DTO de resumen de cuna proveniente del backend (`Api['CribOverview']`).
 * @returns Entidad `Cuna` lista para renderizar en el tablero clínico.
 */
export function mapCuna(datos: Api['CribOverview']): Cuna {
  const estado = ESTADO_CUNA_DESDE_API[datos.status];
  const base: Cuna = {
    id: datos.id,
    identificador: datos.code,
    nombre: datos.name,
    ubicacion: datos.location,
    estado,
    dispositivoActivo: datos.is_device_active,
    pacienteId: datos.patient?.id ?? null,
    pacienteNombre: datos.patient?.full_name ?? null,
    pacienteIdentificador: datos.patient?.medical_record_number ?? null,
    alertasAbiertas: datos.open_alerts.total,
    tieneAlertaCritica: datos.highest_open_severity === 'critical',
    ritmoCardiaco: null,
    spo2: null,
    temperatura: null,
    dormido: null,
    canulaOk: null,
    viaIvActiva: null,
    enMantenimiento: estado === 'mantenimiento',
    ultimaActualizacion: datos.last_telemetry_at ?? '',
  };
  return datos.latest_reading
    ? aplicarLectura(base, datos.latest_reading)
    : base;
}
