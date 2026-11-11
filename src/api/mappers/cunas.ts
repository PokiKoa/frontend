/**
 * @file cunas.ts
 * @description Traducción de las cunas del resumen de la unidad del backend v2.
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

/** Aplica una lectura de telemetría sobre una cuna ya mapeada. */
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
