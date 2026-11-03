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

const ESTADO_HACIA_API: Record<
  EstadoPrescripcion,
  Api['PrescriptionStatusEnum']
> = {
  Vigente: 'active',
  Completada: 'completed',
  Cancelada: 'cancelled',
};

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

export async function crearCatalogo(
  datos: CatalogoPayload
): Promise<MedicamentoCatalogo> {
  const { data } = await api.post<Api['MedicationCatalogItem']>(
    '/medication-catalog/',
    mapCatalogoPayload(datos)
  );
  return mapCatalogo(data);
}

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
 * Registra una dosis. Sin `programadaPara`, el backend toma la dosis más
 * reciente ya habilitada (hasta 60 minutos antes de su horario).
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

export async function listarAdministraciones(
  id: number
): Promise<Administracion[]> {
  const { data } = await api.get<Paginado<Api['MedicationAdministration']>>(
    `/prescriptions/${id}/administrations/`,
    { params: { page_size: 100 } }
  );
  return data.results.map(mapAdministracion);
}

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
