/**
 * @file alertasService.ts
 * @description Alertas clínicas (`/api/v1/alerts/`).
 */

import { api } from '@/api/axios';
import {
  ESTADO_HACIA_API,
  mapAlerta,
  NIVEL_HACIA_API,
  TIPO_HACIA_API,
} from '@/api/mappers/alertas';
import type { Api, Paginado } from '@/api/tipos';
import type { EventoTiempoReal } from '@/api/tiempoReal';
import type { Alerta, FiltrosAlertas, Notificacion } from '@/types/alerta';

export interface PaginaAlertas {
  total: number;
  alertas: Alerta[];
}

export async function listarAlertas(
  filtros: FiltrosAlertas = {}
): Promise<PaginaAlertas> {
  const { data } = await api.get<Paginado<Api['Alert']>>('/alerts/', {
    params: {
      is_open: filtros.abiertas,
      severity: filtros.nivel && NIVEL_HACIA_API[filtros.nivel],
      alert_type: filtros.tipo && TIPO_HACIA_API[filtros.tipo],
      status: filtros.estado && ESTADO_HACIA_API[filtros.estado],
      patient: filtros.pacienteId,
      crib: filtros.cunaId,
      triggered_after: filtros.desde,
      page: filtros.pagina,
      page_size: 50,
      ordering: '-triggered_at',
    },
  });
  return { total: data.count, alertas: data.results.map(mapAlerta) };
}

/** Alertas abiertas (activas y reconocidas), las más recientes primero. */
export async function listarAlertasAbiertas(): Promise<Alerta[]> {
  const { data } = await api.get<Paginado<Api['Alert']>>('/alerts/', {
    params: { is_open: true, page_size: 100, ordering: '-triggered_at' },
  });
  return data.results.map(mapAlerta);
}

export async function reconocerAlerta(id: number): Promise<Alerta> {
  const { data } = await api.post<Api['Alert']>(`/alerts/${id}/acknowledge/`);
  return mapAlerta(data);
}

export async function resolverAlerta(id: number): Promise<Alerta> {
  const { data } = await api.post<Api['Alert']>(`/alerts/${id}/resolve/`);
  return mapAlerta(data);
}

/**
 * Aplica un evento del WebSocket sobre una lista de alertas abiertas: agrega o
 * actualiza las que siguen abiertas y quita las resueltas, sin volver a pedirlas.
 *
 * @returns La misma lista si el evento no la cambia (evita renders inútiles).
 */
export function aplicarEventoAlertas(
  alertas: Alerta[],
  evento: EventoTiempoReal
): Alerta[] {
  let abiertas: Api['Alert'][] = [];
  let cerradas: Api['Alert'][] = [];

  if (evento.event === 'telemetry.reading') {
    abiertas = (evento.active_alerts as Api['Alert'][] | undefined) ?? [];
    cerradas =
      (evento.auto_resolved_alerts as Api['Alert'][] | undefined) ?? [];
  } else if (evento.event.startsWith('alert.') && evento.alert) {
    const alerta = evento.alert as Api['Alert'];
    if (alerta.status === 'resolved') cerradas = [alerta];
    else abiertas = [alerta];
  }
  if (abiertas.length === 0 && cerradas.length === 0) return alertas;

  const porId = new Map(alertas.map((alerta) => [alerta.id, alerta]));
  for (const cruda of cerradas) porId.delete(cruda.id);
  for (const cruda of abiertas) porId.set(cruda.id, mapAlerta(cruda));
  return [...porId.values()].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
  );
}

export function alertasANotificaciones(alertas: Alerta[]): Notificacion[] {
  return alertas
    .slice()
    .sort(
      (a, b) =>
        new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    )
    .map((alerta) => ({
      id: `alerta-${alerta.id}`,
      titulo:
        alerta.nivel === 'Critica'
          ? 'Alerta crítica'
          : alerta.nivel === 'Advertencia'
            ? 'Advertencia clínica'
            : 'Información clínica',
      detalle: `${alerta.mensaje} · Cuna ${alerta.cunaIdentificador}`,
      fechaHora: alerta.fechaHora,
      critica: alerta.nivel === 'Critica',
      leida: alerta.estado !== 'activa',
      ruta: '/alertas',
    }));
}

export const alertasService = {
  listar: listarAlertas,
  abiertas: listarAlertasAbiertas,
  reconocer: reconocerAlerta,
  resolver: resolverAlerta,
};
