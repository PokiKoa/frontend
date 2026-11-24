/**
 * @file registrosService.ts
 * @description Bitácora de auditoría (`/audit-logs/`, solo administradores).
 */

import { api } from '@/api/axios';
import {
  ACCION_HACIA_API,
  mapRegistro,
  mapResumenAuditoria,
} from '@/api/mappers/registros';
import type { Api, Paginado } from '@/api/tipos';
import type {
  FiltrosAuditoria,
  RegistroActividad,
  ResumenAuditoria,
} from '@/types/registro';

/**
 * Transforma los filtros de auditoría del dominio en los parámetros de consulta
 * esperados por la API, expandiendo las fechas `YYYY-MM-DD` para cubrir el día completo.
 *
 * @param filtros - Criterios opcionales de acción, entidad, usuario, rango de fechas y texto.
 * @returns Objeto de parámetros serializados para la consulta HTTP.
 */
function parametros(filtros: FiltrosAuditoria) {
  return {
    action: filtros.accion && ACCION_HACIA_API[filtros.accion],
    resource_type: filtros.entidad || undefined,
    actor_user: filtros.usuarioId,
    timestamp_after: filtros.desde ? `${filtros.desde}T00:00:00` : undefined,
    timestamp_before: filtros.hasta ? `${filtros.hasta}T23:59:59` : undefined,
    search: filtros.search?.trim() || undefined,
  };
}

/**
 * Obtiene una página de registros de auditoría según los filtros aplicados.
 *
 * @param filtros - Criterios opcionales de filtrado y paginación.
 * @param tamano - Cantidad máxima de registros por página (por defecto 20).
 * @returns Total de coincidencias y registros de actividad mapeados al dominio.
 */
export async function listarRegistros(
  filtros: FiltrosAuditoria = {},
  tamano = 20
): Promise<{ total: number; registros: RegistroActividad[] }> {
  const { data } = await api.get<Paginado<Api['AuditLog']>>('/audit-logs/', {
    params: { ...parametros(filtros), page: filtros.pagina, page_size: tamano },
  });
  return { total: data.count, registros: data.results.map(mapRegistro) };
}

/**
 * Obtiene el conteo agrupado de eventos de auditoría por tipo de acción.
 *
 * @param filtros - Criterios opcionales para acotar el resumen.
 * @returns Lista de resúmenes por acción mapeados al dominio.
 */
export async function obtenerResumenRegistros(
  filtros: FiltrosAuditoria = {}
): Promise<ResumenAuditoria[]> {
  const { data } = await api.get<Api['AuditActionCount'][]>(
    '/audit-logs/summary/',
    {
      params: parametros(filtros),
    }
  );
  return data.map(mapResumenAuditoria);
}

/** Operaciones del servicio REST de bitácora de auditoría. */
export const registrosService = {
  listar: listarRegistros,
  resumen: obtenerResumenRegistros,
};
