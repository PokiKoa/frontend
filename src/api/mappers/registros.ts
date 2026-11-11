/**
 * @file registros.ts
 * @description Traducción de la bitácora de auditoría (`/audit-logs/`).
 */

import type { Api } from '@/api/tipos';
import { toCsv } from '@/utils/csv';
import type {
  AccionAuditoria,
  RegistroActividad,
  ResumenAuditoria,
} from '@/types/registro';

export const ACCION_DESDE_API: Record<Api['ActionEnum'], AccionAuditoria> = {
  read: 'lectura',
  create: 'crear',
  update: 'actualizar',
  discharge: 'alta',
  assign_crib: 'asignar',
  release_crib: 'liberar',
  swap_crib: 'intercambiar',
  delete: 'eliminar',
  ingest_telemetry: 'telemetria',
  acknowledge_alert: 'reconocer',
  resolve_alert: 'resolver',
  prescribe_medication: 'prescribir',
  administer_medication: 'administrar',
  login_success: 'login',
  login_failed: 'login_fallido',
  logout: 'logout',
  account_locked: 'bloqueo',
};

export const ACCION_HACIA_API = Object.fromEntries(
  Object.entries(ACCION_DESDE_API).map(([api, ui]) => [ui, api])
) as Record<AccionAuditoria, Api['ActionEnum']>;

export const ETIQUETA_ACCION: Record<AccionAuditoria, string> = {
  lectura: 'Lectura',
  crear: 'Creación',
  actualizar: 'Actualización',
  alta: 'Egreso clínico',
  asignar: 'Asignación de cuna',
  liberar: 'Liberación de cuna',
  intercambiar: 'Intercambio de cunas',
  eliminar: 'Eliminación definitiva',
  telemetria: 'Ingesta de telemetría',
  reconocer: 'Reconocimiento de alerta',
  resolver: 'Resolución de alerta',
  prescribir: 'Indicación médica',
  administrar: 'Administración de medicamento',
  login: 'Inicio de sesión',
  login_fallido: 'Intento fallido',
  logout: 'Cierre de sesión',
  bloqueo: 'Bloqueo de cuenta',
};

/** Tipos de recurso que registra el backend (`resource_type`). */
export const ETIQUETA_ENTIDAD: Record<string, string> = {
  patient: 'Paciente',
  patient_stream: 'Monitoreo en vivo',
  crib: 'Cuna',
  prescription: 'Indicación médica',
  medication_catalog: 'Catálogo de medicamentos',
  care_plan: 'Plan de cuidado',
  observation: 'Observación clínica',
  alert: 'Alerta',
  alert_threshold_config: 'Umbrales de alerta',
  shift_assignment: 'Asignación de turno',
  user: 'Usuario',
  auth: 'Autenticación',
};

export function mapRegistro(datos: Api['AuditLog']): RegistroActividad {
  const accion = ACCION_DESDE_API[datos.action];
  const entidad = ETIQUETA_ENTIDAD[datos.resource_type] ?? datos.resource_type;
  const campos = Array.isArray(datos.changed_fields)
    ? (datos.changed_fields as unknown[]).map(String)
    : [];
  return {
    id: datos.id,
    usuarioId: datos.actor_user,
    usuarioNombre: datos.actor_name || datos.actor_device_code || 'Sistema',
    accion,
    accionDisplay: ETIQUETA_ACCION[accion],
    entidad,
    entidadId: datos.resource_id || null,
    pacienteId: datos.patient_id,
    descripcion: `${ETIQUETA_ACCION[accion]} · ${entidad}${datos.resource_id ? ` #${datos.resource_id}` : ''}${
      campos.length ? ` (${campos.join(', ')})` : ''
    }`,
    camposModificados: campos,
    ipAddress: datos.ip_address,
    creadoEn: datos.timestamp,
  };
}

export function mapResumenAuditoria(
  datos: Api['AuditActionCount']
): ResumenAuditoria {
  return { accion: ACCION_DESDE_API[datos.action], total: datos.total };
}

/**
 * Arma el CSV de la bitácora con el exportador compartido. Solo incluye
 * nombres de campos modificados: la auditoría nunca guarda valores clínicos.
 */
export function registrosACsv(registros: readonly RegistroActividad[]): string {
  return toCsv([
    [
      'Fecha',
      'Responsable',
      'Acción',
      'Entidad',
      'ID entidad',
      'Descripción',
      'Campos modificados',
      'IP',
    ],
    ...registros.map((r) => [
      r.creadoEn,
      r.usuarioNombre,
      r.accionDisplay || ETIQUETA_ACCION[r.accion],
      r.entidad,
      r.entidadId,
      r.descripcion,
      r.camposModificados.join(', '),
      r.ipAddress,
    ]),
  ]);
}
