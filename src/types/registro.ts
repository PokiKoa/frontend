/**
 * @file registro.ts
 * @description Bitácora de auditoría clínica y de seguridad (sin datos clínicos).
 */

export type AccionAuditoria =
  | 'lectura'
  | 'crear'
  | 'actualizar'
  | 'alta'
  | 'asignar'
  | 'liberar'
  | 'intercambiar'
  | 'eliminar'
  | 'telemetria'
  | 'reconocer'
  | 'resolver'
  | 'prescribir'
  | 'administrar'
  | 'login'
  | 'login_fallido'
  | 'logout'
  | 'bloqueo';

/** Evento individual de la bitácora de auditoría normalizado para la interfaz. */
export interface RegistroActividad {
  id: number;
  usuarioId: number | null;
  usuarioNombre: string;
  accion: AccionAuditoria;
  accionDisplay: string;
  entidad: string;
  entidadId: string | null;
  pacienteId: number | null;
  descripcion: string;
  /** Solo nombres de campos modificados: la auditoría nunca guarda valores clínicos. */
  camposModificados: string[];
  ipAddress: string | null;
  creadoEn: string;
}

/** Conteo agregado de eventos de auditoría agrupado por tipo de acción. */
export interface ResumenAuditoria {
  accion: AccionAuditoria;
  total: number;
}

/** Criterios opcionales para filtrar consultas en la bitácora de auditoría. */
export interface FiltrosAuditoria {
  accion?: AccionAuditoria;
  entidad?: string;
  usuarioId?: number;
  /** Fecha de inicio inclusive en formato `YYYY-MM-DD`. */
  desde?: string;
  /** Fecha de término inclusive en formato `YYYY-MM-DD`. */
  hasta?: string;
  search?: string;
  pagina?: number;
}
