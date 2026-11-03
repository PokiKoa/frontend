/**
 * @file registros.ts
 * @description Traducción de la bitácora de auditoría (`/audit-logs/`).
 */

import type { Api } from '@/api/tipos';
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
