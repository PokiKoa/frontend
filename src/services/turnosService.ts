/**
 * @file turnosService.ts
 * @description Turnos (`/shifts/`), asignaciones (`/shift-assignments/`) y directorio de personal.
 */

import { api } from '@/api/axios';
import {
  mapAsignacion,
  mapAsignacionPayload,
  mapMiembro,
  mapMisCunas,
  mapTurno,
} from '@/api/mappers/turnos';
import type { Api, Paginado } from '@/api/tipos';
import type {
  Asignacion,
  AsignacionPayload,
  MiembroPersonal,
  RespuestaMisCunas,
  Turno,
} from '@/types/turnos';

/**
 * Obtiene el catálogo de turnos operativos configurados en la unidad.
 *
 * @returns Lista de turnos mapeados al dominio.
 */
export async function listarTurnos(): Promise<Turno[]> {
  const { data } = await api.get<Api['Shift'][]>('/shifts/');
  return data.map(mapTurno);
}

/**
 * Obtiene las asignaciones de personal a cunas para una fecha específica,
 * enriquecidas con la información del turno correspondiente.
 *
 * @param fecha - Fecha a consultar en formato `YYYY-MM-DD`.
 * @returns Lista de asignaciones mapeadas al dominio.
 */
export async function listarAsignaciones(fecha: string): Promise<Asignacion[]> {
  const [turnos, { data }] = await Promise.all([
    listarTurnos(),
    api.get<Paginado<Api['ShiftAssignment']>>('/shift-assignments/', {
      params: { date: fecha, page_size: 100 },
    }),
  ]);
  return data.results.map((cruda) => mapAsignacion(cruda, turnos));
}

/**
 * Registra una nueva asignación de un miembro del personal a una cuna y turno.
 *
 * @param datos - Datos de la asignación a crear.
 */
export async function crearAsignacion(datos: AsignacionPayload): Promise<void> {
  await api.post('/shift-assignments/', mapAsignacionPayload(datos));
}

/**
 * Elimina una asignación de turno existente.
 *
 * @param id - Identificador numérico de la asignación.
 */
export async function eliminarAsignacion(id: number): Promise<void> {
  await api.delete(`/shift-assignments/${id}/`);
}

/**
 * Obtiene las cunas asignadas al profesional autenticado en su turno activo.
 *
 * @returns Resumen del turno actual y cunas asignadas al usuario.
 */
export async function misCunas(): Promise<RespuestaMisCunas> {
  const [turnos, { data }] = await Promise.all([
    listarTurnos(),
    api.get<Api['MyShift']>('/shift-assignments/mine/'),
  ]);
  return mapMisCunas(data, turnos);
}

/**
 * Obtiene el personal clínico asignable a cunas (roles de neonatología y enfermería).
 *
 * @returns Lista filtrada de miembros del personal mapeados al dominio.
 */
export async function listarPersonalAsignable(): Promise<MiembroPersonal[]> {
  const { data } = await api.get<Paginado<Api['StaffMember']>>('/staff/', {
    params: { page_size: 100 },
  });
  return data.results
    .map(mapMiembro)
    .filter(
      (miembro) => miembro.rol === 'medico' || miembro.rol === 'enfermeria'
    );
}

/** Operaciones del servicio REST de turnos y asignaciones de personal. */
export const turnosService = {
  listarTurnos,
  listarAsignaciones,
  crearAsignacion,
  eliminarAsignacion,
  misCunas,
  personalAsignable: listarPersonalAsignable,
};
