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
  mapMovimientoCuna,
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
  MovimientoCuna,
  Paciente,
  PacientePayload,
  RegistroPeso,
} from '@/types/paciente';

/** Página de resultados del listado de pacientes. */
export interface PaginaPacientes {
  /** Total de registros disponibles en el servidor. */
  total: number;
  /** Pacientes mapeados al modelo de dominio. */
  pacientes: Paciente[];
}

/**
 * Obtiene una página de pacientes según los filtros clínicos y administrativos indicados.
 *
 * @param filtros - Criterios opcionales de búsqueda, estado, médico, cuna o fechas de ingreso.
 * @param tamano - Cantidad máxima de registros por página (por defecto 20).
 * @returns Total de coincidencias y pacientes de la página solicitada.
 */
export async function listarPacientes(
  filtros: FiltrosPacientes = {},
  tamano = 20
): Promise<PaginaPacientes> {
  const { data } = await api.get<Paginado<Api['Patient']>>('/patients/', {
    params: {
      search: filtros.search?.trim() || undefined,
      sex: filtros.sexo,
      status: filtros.estado && ESTADO_PACIENTE_HACIA_API[filtros.estado],
      active: filtros.activo,
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

/**
 * Obtiene los pacientes activos en la unidad que aún no tienen cuna asignada.
 *
 * @returns Lista de pacientes activos sin cuna.
 */
export async function listarPacientesSinCuna(): Promise<Paciente[]> {
  const { pacientes } = await listarPacientes({ estado: 'activo' }, 100);
  return pacientes.filter((paciente) => paciente.cunaId === null);
}

/**
 * Obtiene el detalle completo de un paciente por su identificador.
 *
 * @param id - Identificador numérico del paciente.
 * @returns Paciente mapeado al dominio.
 */
export async function obtenerPaciente(id: number): Promise<Paciente> {
  const { data } = await api.get<Api['Patient']>(`/patients/${id}/`);
  return mapPaciente(data);
}

/**
 * Registra el ingreso de un nuevo paciente en la unidad.
 *
 * @param payload - Datos de ingreso del paciente.
 * @returns Paciente creado y mapeado al dominio.
 */
export async function crearPaciente(
  payload: PacientePayload
): Promise<Paciente> {
  const { data } = await api.post<Api['Patient']>(
    '/patients/',
    mapPacienteCreacion(payload)
  );
  return mapPaciente(data);
}

/**
 * Actualiza parcialmente los datos de un paciente existente.
 *
 * @param id - Identificador numérico del paciente.
 * @param payload - Datos modificados del paciente.
 * @param opciones - Controla si se incluyen campos médicos restringidos en la edición.
 * @returns Paciente actualizado y mapeado al dominio.
 */
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

/**
 * Registra el egreso clínico de un paciente.
 *
 * @param id - Identificador numérico del paciente.
 * @param payload - Datos del alta o egreso.
 * @returns Paciente actualizado tras el egreso.
 */
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

/**
 * Obtiene el historial de movimientos de cuna del paciente, ordenado del más reciente al más antiguo.
 *
 * @param id - Identificador numérico del paciente.
 * @returns Lista de movimientos de cuna mapeados al dominio.
 */
export async function listarMovimientosCuna(
  id: number
): Promise<MovimientoCuna[]> {
  const { data } = await api.get<Api['CribMovement'][]>(
    `/patients/${id}/crib-movements/`
  );
  return data.map(mapMovimientoCuna);
}

/**
 * Elimina de forma permanente al paciente y todo su historial clínico (solo administración).
 *
 * @param id - Identificador numérico del paciente.
 * @param confirmacion - Número de ficha escrito por el usuario para confirmar la eliminación.
 */
export async function eliminarPacienteDefinitivo(
  id: number,
  confirmacion: string
): Promise<void> {
  await api.post(`/patients/${id}/delete-permanently/`, {
    confirmation: confirmacion,
  });
}

/**
 * Obtiene el historial de registros de peso de un paciente.
 *
 * @param id - Identificador numérico del paciente.
 * @returns Lista de mediciones de peso mapeadas al dominio.
 */
export async function listarPesos(id: number): Promise<RegistroPeso[]> {
  const { data } = await api.get<Paginado<Api['WeightRecord']>>(
    `/patients/${id}/weights/`,
    {
      params: { page_size: 100 },
    }
  );
  return data.results.map(mapPeso);
}

/**
 * Registra una nueva medición de peso para un paciente.
 *
 * @param id - Identificador numérico del paciente.
 * @param pesoG - Peso registrado expresado en gramos.
 * @returns Registro de peso creado y mapeado al dominio.
 */
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

/**
 * Obtiene las lecturas de signos vitales de un paciente, ordenadas de más reciente a más antigua.
 *
 * @param id - Identificador numérico del paciente.
 * @param opciones - Filtro temporal opcional (`desde` en formato ISO) y límite de resultados.
 * @returns Lista de lecturas vitales mapeadas al dominio.
 */
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

/**
 * Obtiene el listado de médicos neonatólogos disponibles en el personal clínico.
 *
 * @param search - Texto opcional para filtrar por nombre o identificador.
 * @returns Lista de médicos mapeados al dominio.
 */
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

/** Operaciones del servicio REST de pacientes. */
export const pacientesService = {
  listar: listarPacientes,
  sinCuna: listarPacientesSinCuna,
  obtener: obtenerPaciente,
  crear: crearPaciente,
  actualizar: actualizarPaciente,
  egresar: egresarPaciente,
  movimientosCuna: listarMovimientosCuna,
  eliminarDefinitivo: eliminarPacienteDefinitivo,
  pesos: listarPesos,
  registrarPeso,
  lecturas: listarLecturas,
  medicos: listarMedicos,
};
