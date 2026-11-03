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

export async function listarTurnos(): Promise<Turno[]> {
  const { data } = await api.get<Api['Shift'][]>('/shifts/');
  return data.map(mapTurno);
}

export async function listarAsignaciones(fecha: string): Promise<Asignacion[]> {
  const [turnos, { data }] = await Promise.all([
    listarTurnos(),
    api.get<Paginado<Api['ShiftAssignment']>>('/shift-assignments/', {
      params: { date: fecha, page_size: 100 },
    }),
  ]);
  return data.results.map((cruda) => mapAsignacion(cruda, turnos));
}

export async function crearAsignacion(datos: AsignacionPayload): Promise<void> {
  await api.post('/shift-assignments/', mapAsignacionPayload(datos));
}

export async function eliminarAsignacion(id: number): Promise<void> {
  await api.delete(`/shift-assignments/${id}/`);
}

export async function misCunas(): Promise<RespuestaMisCunas> {
  const [turnos, { data }] = await Promise.all([
    listarTurnos(),
    api.get<Api['MyShift']>('/shift-assignments/mine/'),
  ]);
  return mapMisCunas(data, turnos);
}

/** Personal activo asignable a cunas (neonatología y enfermería). */
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

export const turnosService = {
  listarTurnos,
  listarAsignaciones,
  crearAsignacion,
  eliminarAsignacion,
  misCunas,
  personalAsignable: listarPersonalAsignable,
};
