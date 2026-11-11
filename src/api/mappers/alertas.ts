/**
 * @file alertas.ts
 * @description Traducción de alertas del backend v2.
 */

import type { Api } from '@/api/tipos';
import type {
  Alerta,
  EstadoAlerta,
  NivelAlerta,
  TipoAlerta,
} from '@/types/alerta';

export const NIVEL_DESDE_API: Record<Api['AlertSeverityEnum'], NivelAlerta> = {
  info: 'Info',
  warning: 'Advertencia',
  critical: 'Critica',
};

export const NIVEL_HACIA_API: Record<NivelAlerta, Api['AlertSeverityEnum']> = {
  Info: 'info',
  Advertencia: 'warning',
  Critica: 'critical',
};

export const ETIQUETA_NIVEL: Record<NivelAlerta, string> = {
  Info: 'Informativa',
  Advertencia: 'Advertencia',
  Critica: 'Crítica',
};

export const TIPO_DESDE_API: Record<Api['AlertTypeEnum'], TipoAlerta> = {
  heart_rate: 'ritmo_cardiaco',
  spo2: 'spo2',
  temperature: 'temperatura',
  cannula: 'canula',
  sensor_fault: 'fallo_sensor',
  other: 'otra',
};

export const TIPO_HACIA_API = Object.fromEntries(
  Object.entries(TIPO_DESDE_API).map(([api, ui]) => [ui, api])
) as Record<TipoAlerta, Api['AlertTypeEnum']>;

export const ETIQUETA_TIPO: Record<TipoAlerta, string> = {
  ritmo_cardiaco: 'Frecuencia cardíaca',
  spo2: 'Saturación (SpO₂)',
  temperatura: 'Temperatura',
  canula: 'Cánula de oxígeno',
  fallo_sensor: 'Fallo de sensor',
  otra: 'Otra alerta',
};

export const ESTADO_DESDE_API: Record<Api['AlertStatusEnum'], EstadoAlerta> = {
  active: 'activa',
  acknowledged: 'reconocida',
  resolved: 'resuelta',
};

export const ESTADO_HACIA_API = Object.fromEntries(
  Object.entries(ESTADO_DESDE_API).map(([api, ui]) => [ui, api])
) as Record<EstadoAlerta, Api['AlertStatusEnum']>;

/** Convierte un decimal serializado como texto en número. */
export function decimal(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function mapAlerta(datos: Api['Alert']): Alerta {
  const nivel = NIVEL_DESDE_API[datos.severity];
  const tipo = TIPO_DESDE_API[datos.alert_type];
  const estado = ESTADO_DESDE_API[datos.status];
  return {
    id: datos.id,
    pacienteId: datos.patient,
    pacienteNombre: datos.patient_name || null,
    cunaId: datos.crib,
    cunaIdentificador: datos.crib_code,
    tipo,
    tipoDisplay: ETIQUETA_TIPO[tipo],
    nivel,
    nivelDisplay: ETIQUETA_NIVEL[nivel],
    estado,
    activa: estado !== 'resuelta',
    mensaje: datos.message,
    fechaHora: datos.triggered_at,
    valorLeido: decimal(datos.measured_value),
    valorUmbral: decimal(datos.threshold_value),
    ocurrencias: datos.occurrence_count,
    reconocidaPor: datos.acknowledged_by_name || null,
    reconocidaEn: datos.acknowledged_at,
    resueltaPor: datos.resolved_by_name || null,
    resueltaEn: datos.resolved_at,
  };
}
