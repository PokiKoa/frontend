/**
 * @file turnos.ts
 * @description Turnos fijos de la unidad, asignaciones de personal a cunas y
 * las cunas del profesional en su turno vigente.
 */

import type { ClaveTurno, Rol } from '@/types/auth';

/** Bloque horario fijo configurado en la unidad neonatal. */
export interface Turno {
  /** Clave del turno en el backend (`morning`, `afternoon`, `night`). */
  id: ClaveTurno;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
  duracionHoras: number;
  actual: boolean;
}

/** Asignación de un profesional a una cuna dentro de un turno y fecha específicos. */
export interface Asignacion {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioIniciales: string;
  usuarioRol: Rol | null;
  turnoId: ClaveTurno;
  turnoNombre: string;
  turnoHoraInicio: string;
  turnoHoraFin: string;
  cunaId: number;
  cunaIdentificador: string;
  fecha: string;
  creadoPor: number;
  creadoEn: string;
}

/** Datos requeridos para registrar una nueva asignación de turno. */
export interface AsignacionPayload {
  /** Identificador numérico del miembro del personal. */
  usuario: number;
  turno: ClaveTurno;
  /** Identificador numérico de la cuna. */
  cuna: number;
  /** Fecha de la asignación en formato `YYYY-MM-DD`. */
  fecha: string;
}

/** Cuna asignada al profesional autenticado con el estado clínico resumido de su paciente. */
export interface MisCunas {
  cunaId: number;
  cunaIdentificador: string;
  turno: string;
  horaInicio: string;
  horaFin: string;
  pacienteId: number | null;
  pacienteNombre: string | null;
  pacienteIdentificador: string | null;
  ritmoCardiaco: number | null;
  spo2: number | null;
  temperatura: number | null;
  alertasActivas: number;
}

/** Respuesta del turno vigente con el listado de cunas bajo responsabilidad del usuario. */
export interface RespuestaMisCunas {
  fecha: string;
  total: number;
  cunas: MisCunas[];
}

/** Miembro del personal clínico disponible para planificación de turnos. */
export interface MiembroPersonal {
  id: number;
  nombreCompleto: string;
  iniciales: string;
  rol: Rol;
  turno: ClaveTurno | null;
}
