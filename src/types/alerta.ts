/**
 * @file alerta.ts
 * @description Alertas clínicas y técnicas tal como las usa la interfaz.
 */

export type NivelAlerta = 'Info' | 'Advertencia' | 'Critica';

export type TipoAlerta =
  | 'ritmo_cardiaco'
  | 'spo2'
  | 'temperatura'
  | 'canula'
  | 'fallo_sensor'
  | 'otra';

export type EstadoAlerta = 'activa' | 'reconocida' | 'resuelta';

/** Alerta clínica o técnica normalizada para su visualización y gestión en la interfaz. */
export interface Alerta {
  id: number;
  pacienteId: number | null;
  pacienteNombre: string | null;
  cunaId: number;
  cunaIdentificador: string;
  tipo: TipoAlerta;
  tipoDisplay: string;
  nivel: NivelAlerta;
  nivelDisplay: string;
  estado: EstadoAlerta;
  /** Abierta = activa o reconocida (aún no resuelta). */
  activa: boolean;
  mensaje: string;
  fechaHora: string;
  valorLeido: number | null;
  valorUmbral: number | null;
  ocurrencias: number;
  reconocidaPor: string | null;
  reconocidaEn: string | null;
  resueltaPor: string | null;
  resueltaEn: string | null;
}

/** Criterios opcionales para filtrar consultas de alertas clínicas. */
export interface FiltrosAlertas {
  /** `true`: activas y reconocidas; `false`: resueltas. */
  abiertas?: boolean;
  nivel?: NivelAlerta;
  tipo?: TipoAlerta;
  estado?: EstadoAlerta;
  pacienteId?: number;
  cunaId?: number;
  desde?: string;
  pagina?: number;
}

/** Notificación derivada de una alerta para la bandeja superior de la aplicación. */
export interface Notificacion {
  id: string;
  /** Alerta y severidad: si la alerta escala, la notificación vuelve a mostrarse aunque se haya limpiado. */
  clave: string;
  titulo: string;
  detalle: string;
  fechaHora: string;
  critica: boolean;
  leida: boolean;
  ruta: string;
}