/**
 * @file turnos.ts
 * @description Turnos fijos de la unidad, asignaciones de personal a cunas y
 * las cunas del profesional en su turno vigente.
 */

import type { ClaveTurno, Rol } from '@/types/auth';

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

export interface AsignacionPayload {
  usuario: number;
  turno: ClaveTurno;
  cuna: number;
  fecha: string;
}

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

export interface RespuestaMisCunas {
  fecha: string;
  total: number;
  cunas: MisCunas[];
}

export interface MiembroPersonal {
  id: number;
  nombreCompleto: string;
  iniciales: string;
  rol: Rol;
  turno: ClaveTurno | null;
}
