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

export interface Notificacion {
  id: string;
  titulo: string;
  detalle: string;
  fechaHora: string;
  critica: boolean;
  leida: boolean;
  ruta: string;
}
