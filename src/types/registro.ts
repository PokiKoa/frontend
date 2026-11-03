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

export interface ResumenAuditoria {
  accion: AccionAuditoria;
  total: number;
}

export interface FiltrosAuditoria {
  accion?: AccionAuditoria;
  entidad?: string;
  usuarioId?: number;
  desde?: string;
  hasta?: string;
  search?: string;
  pagina?: number;
}
