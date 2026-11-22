/**
 * @file medicamentosService.ts
 * @description Catálogo de farmacia (`/medication-catalog/`) e indicaciones (`/prescriptions/`).
 */

import { api } from '@/api/axios';
import {
  mapAdministracion,
  mapCatalogo,
  mapCatalogoPayload,
  mapPrescripcion,
  mapPrescripcionPayload,
} from '@/api/mappers/medicamentos';
import type { Api, Paginado } from '@/api/tipos';
import type {
  Administracion,
  CatalogoPayload,
  EstadoPrescripcion,
  Medicamento,
  MedicamentoCatalogo,
  MedicamentoPayload,
} from '@/types/medicamento';

/** Equivalencia entre el estado de prescripción en dominio y el enum esperado por la API. */
const ESTADO_HACIA_API: Record<
  EstadoPrescripcion,
  Api['PrescriptionStatusEnum']
> = {
  Vigente: 'active',
  Completada: 'completed',
  Cancelada: 'cancelled',
};

/**
 * Obtiene los medicamentos del catálogo de farmacia según los filtros indicados.
 *
 * @param filtros - Criterios opcionales de búsqueda por texto, stock bajo o estado activo.
 * @returns Lista de medicamentos del catálogo mapeados al dominio.
 */
export async function listarCatalogo(
  filtros: { search?: string; stockBajo?: boolean; soloActivos?: boolean } = {}
): Promise<MedicamentoCatalogo[]> {
  const { data } = await api.get<Paginado<Api['MedicationCatalogItem']>>(
    '/medication-catalog/',
    {
      params: {
        search: filtros.search?.trim() || undefined,
        low_stock: filtros.stockBajo || undefined,
        is_active: filtros.soloActivos || undefined,
        page_size: 100,
      },
    }
  );
  return data.results.map(mapCatalogo);
}

/**
 * Registra un nuevo medicamento en el catálogo de farmacia.
 *
 * @param datos - Datos del medicamento a crear.
 * @returns Ítem del catálogo creado y mapeado al dominio.
 */
export async function crearCatalogo(
  datos: CatalogoPayload
): Promise<MedicamentoCatalogo> {
  const { data } = await api.post<Api['MedicationCatalogItem']>(
    '/medication-catalog/',
    mapCatalogoPayload(datos)
  );
  return mapCatalogo(data);
}

/**
 * Actualiza parcialmente un medicamento existente del catálogo de farmacia.
 *
 * @param id - Identificador numérico del ítem en el catálogo.
 * @param datos - Campos del medicamento a actualizar.
 * @returns Ítem del catálogo actualizado y mapeado al dominio.
 */
export async function actualizarCatalogo(
  id: number,
  datos: CatalogoPayload
): Promise<MedicamentoCatalogo> {
  const { data } = await api.patch<Api['MedicationCatalogItem']>(
    `/medication-catalog/${id}/`,
    mapCatalogoPayload(datos)
  );
  return mapCatalogo(data);
}

/**
 * Obtiene las prescripciones médicas filtradas por paciente y/o estado.
 *
 * @param filtros - Criterios opcionales de filtrado.
 * @returns Lista de prescripciones mapeadas al dominio.
 */
export async function listarPrescripciones(
  filtros: { pacienteId?: number; estado?: EstadoPrescripcion } = {}
): Promise<Medicamento[]> {
  const { data } = await api.get<Paginado<Api['Prescription']>>(
    '/prescriptions/',
    {
      params: {
        patient: filtros.pacienteId,
        status: filtros.estado && ESTADO_HACIA_API[filtros.estado],
        page_size: 100,
      },
    }
  );
  return data.results.map(mapPrescripcion);
}

/**
 * Crea una nueva prescripción médica para un paciente.
 *
 * @param datos - Datos de la indicación farmacológica.
 * @returns Prescripción creada y mapeada al dominio.
 */
export async function crearPrescripcion(
  datos: MedicamentoPayload
): Promise<Medicamento> {
  const { data } = await api.post<Api['Prescription']>(
    '/prescriptions/',
    mapPrescripcionPayload(datos)
  );
  return mapPrescripcion(data);
}

/**
 * Registra la administración de una dosis de una prescripción.
 * Si no se especifica `programadaPara`, el backend selecciona automáticamente
 * la dosis más reciente ya habilitada (hasta 60 minutos antes de su horario).
 *
 * @param id - Identificador numérico de la prescripción.
 * @param opciones - Fecha/hora programada opcional (ISO) y notas clínicas de la toma.
 * @returns Prescripción actualizada tras el registro de la dosis.
 */
export async function administrar(
  id: number,
  {
    programadaPara,
    notas = '',
  }: { programadaPara?: string; notas?: string } = {}
): Promise<Medicamento> {
  const { data } = await api.post<Api['Prescription']>(
    `/prescriptions/${id}/administer/`,
    {
      scheduled_for: programadaPara ?? null,
      notes: notas,
    }
  );
  return mapPrescripcion(data);
}

/**
 * Cancela una prescripción médica vigente indicando el motivo clínico.
 *
 * @param id - Identificador numérico de la prescripción.
 * @param motivo - Justificación de la cancelación.
 * @returns Prescripción actualizada con estado cancelado.
 */
export async function cancelarPrescripcion(
  id: number,
  motivo: string
): Promise<Medicamento> {
  const { data } = await api.post<Api['Prescription']>(
    `/prescriptions/${id}/cancel/`,
    {
      reason: motivo.trim(),
    }
  );
  return mapPrescripcion(data);
}

/**
 * Obtiene el historial de dosis administradas de una prescripción.
 *
 * @param id - Identificador numérico de la prescripción.
 * @returns Lista de administraciones registradas mapeadas al dominio.
 */
export async function listarAdministraciones(
  id: number
): Promise<Administracion[]> {
  const { data } = await api.get<Paginado<Api['MedicationAdministration']>>(
    `/prescriptions/${id}/administrations/`,
    { params: { page_size: 100 } }
  );
  return data.results.map(mapAdministracion);
}

/** Operaciones del servicio de catálogo de farmacia y prescripciones. */
export const medicamentosService = {
  listarCatalogo,
  crearCatalogo,
  actualizarCatalogo,
  listarPrescripciones,
  crearPrescripcion,
  administrar,
  cancelar: cancelarPrescripcion,
  administraciones: listarAdministraciones,
};