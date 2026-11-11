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

/** Fechas `YYYY-MM-DD` del formulario: `hasta` incluye el día completo. */
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

export async function listarRegistros(
  filtros: FiltrosAuditoria = {},
  tamano = 20
): Promise<{ total: number; registros: RegistroActividad[] }> {
  const { data } = await api.get<Paginado<Api['AuditLog']>>('/audit-logs/', {
    params: { ...parametros(filtros), page: filtros.pagina, page_size: tamano },
  });
  return { total: data.count, registros: data.results.map(mapRegistro) };
}

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

export const registrosService = {
  listar: listarRegistros,
  resumen: obtenerResumenRegistros,
};
