/**
 * @file pacientesService.ts
 * @description Pacientes (`/api/v1/patients/`), su evolución ponderal y signos vitales.
 */

import { api } from '@/api/axios';
import {
  ESTADO_PACIENTE_HACIA_API,
  mapEgreso,
  mapLectura,
  mapMedico,
  mapPaciente,
  mapPacienteCreacion,
  mapPacienteEdicion,
  mapPeso,
} from '@/api/mappers/pacientes';
import type { Api, Paginado } from '@/api/tipos';
import type {
  EgresoPayload,
  FiltrosPacientes,
  LecturaVital,
  Medico,
  Paciente,
  PacientePayload,
  RegistroPeso,
} from '@/types/paciente';

export interface PaginaPacientes {
  total: number;
  pacientes: Paciente[];
}

export async function listarPacientes(
  filtros: FiltrosPacientes = {},
  tamano = 20
): Promise<PaginaPacientes> {
  const { data } = await api.get<Paginado<Api['Patient']>>('/patients/', {
    params: {
      search: filtros.search?.trim() || undefined,
      sex: filtros.sexo,
      status: filtros.estado && ESTADO_PACIENTE_HACIA_API[filtros.estado],
      attending_physician: filtros.medicoId,
      crib: filtros.cunaId,
      admitted_after: filtros.ingresoDesde,
      admitted_before: filtros.ingresoHasta,
      page: filtros.pagina,
      page_size: tamano,
    },
  });
  return { total: data.count, pacientes: data.results.map(mapPaciente) };
}

/** Pacientes en la unidad sin cuna asignada (candidatos para asignar). */
export async function listarPacientesSinCuna(): Promise<Paciente[]> {
  const { pacientes } = await listarPacientes({ estado: 'activo' }, 100);
  return pacientes.filter((paciente) => paciente.cunaId === null);
}

export async function obtenerPaciente(id: number): Promise<Paciente> {
  const { data } = await api.get<Api['Patient']>(`/patients/${id}/`);
  return mapPaciente(data);
}

export async function crearPaciente(
  payload: PacientePayload
): Promise<Paciente> {
  const { data } = await api.post<Api['Patient']>(
    '/patients/',
    mapPacienteCreacion(payload)
  );
  return mapPaciente(data);
}

export async function actualizarPaciente(
  id: number,
  payload: PacientePayload,
  opciones: { incluirDatosMedicos: boolean }
): Promise<Paciente> {
  const { data } = await api.patch<Api['Patient']>(
    `/patients/${id}/`,
    mapPacienteEdicion(payload, opciones)
  );
  return mapPaciente(data);
}

export async function egresarPaciente(
  id: number,
  payload: EgresoPayload
): Promise<Paciente> {
  const { data } = await api.post<Api['Patient']>(
    `/patients/${id}/discharge/`,
    mapEgreso(payload)
  );
  return mapPaciente(data);
}

export async function listarPesos(id: number): Promise<RegistroPeso[]> {
  const { data } = await api.get<Paginado<Api['WeightRecord']>>(
    `/patients/${id}/weights/`,
    {
      params: { page_size: 100 },
    }
  );
  return data.results.map(mapPeso);
}

export async function registrarPeso(
  id: number,
  pesoG: number
): Promise<RegistroPeso> {
  const { data } = await api.post<Api['WeightRecord']>(
    `/patients/${id}/weights/`,
    {
      weight_g: pesoG,
    }
  );
  return mapPeso(data);
}

/** Lecturas más recientes primero. */
export async function listarLecturas(
  id: number,
  { desde, tamano = 100 }: { desde?: string; tamano?: number } = {}
): Promise<LecturaVital[]> {
  const { data } = await api.get<Paginado<Api['VitalSignReading']>>(
    `/patients/${id}/vitals/`,
    { params: { recorded_after: desde, page_size: tamano } }
  );
  return data.results.map(mapLectura);
}

export async function listarMedicos(search?: string): Promise<Medico[]> {
  const { data } = await api.get<Paginado<Api['StaffMember']>>('/staff/', {
    params: {
      role: 'neonatologist',
      search: search?.trim() || undefined,
      page_size: 100,
    },
  });
  return data.results.map(mapMedico);
}

export const pacientesService = {
  listar: listarPacientes,
  sinCuna: listarPacientesSinCuna,
  obtener: obtenerPaciente,
  crear: crearPaciente,
  actualizar: actualizarPaciente,
  egresar: egresarPaciente,
  pesos: listarPesos,
  registrarPeso,
  lecturas: listarLecturas,
  medicos: listarMedicos,
};
