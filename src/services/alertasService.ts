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

/** Página de resultados del listado de alertas clínicas. */
export interface PaginaAlertas {
  /** Total de registros disponibles en el servidor. */
  total: number;
  /** Alertas mapeadas al modelo de dominio. */
  alertas: Alerta[];
}

/**
 * Verifica una condición de invariante en tiempo de ejecución y lanza un error
 * descriptivo si se rompe.
 *
 * @param condicion - Expresión booleana que debe cumplirse.
 * @param mensaje - Motivo del fallo de aserción.
 */
function asegurar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new Error(`Fallo de aserción en alertasService: ${mensaje}`);
  }
}

/**
 * Obtiene una página de alertas clínicas filtradas y ordenadas de más reciente a más antigua.
 *
 * @param filtros - Criterios opcionales de filtro y paginación.
 * @returns Total de coincidencias y alertas de la página solicitada.
 */
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

/**
 * Obtiene las alertas abiertas (activas y reconocidas), ordenadas de más reciente a más antigua.
 *
 * @returns Lista de alertas abiertas mapeadas.
 */
export async function listarAlertasAbiertas(): Promise<Alerta[]> {
  const { data } = await api.get<Paginado<Api['Alert']>>('/alerts/', {
    params: { is_open: true, page_size: 100, ordering: '-triggered_at' },
  });
  return data.results.map(mapAlerta);
}

/**
 * Marca una alerta clínica como reconocida.
 *
 * @param id - Identificador numérico de la alerta.
 * @returns Alerta actualizada tras el reconocimiento.
 */
export async function reconocerAlerta(id: number): Promise<Alerta> {
  const { data } = await api.post<Api['Alert']>(`/alerts/${id}/acknowledge/`);
  return mapAlerta(data);
}

/**
 * Marca una alerta clínica como resuelta.
 *
 * @param id - Identificador numérico de la alerta.
 * @returns Alerta actualizada tras su resolución.
 */
export async function resolverAlerta(id: number): Promise<Alerta> {
  const { data } = await api.post<Api['Alert']>(`/alerts/${id}/resolve/`);
  return mapAlerta(data);
}

/**
 * Reconcilia un evento del WebSocket sobre una lista de alertas abiertas: agrega o
 * actualiza las que siguen abiertas y quita las resueltas, sin volver a pedirlas.
 *
 * Pre: `alertas` contiene alertas sin duplicados de `id`; las fechas en `alertas`
 * y en los datos del evento son parseables por `Date`.
 * Post: Si el evento no contiene alertas abiertas ni cerradas, retorna exactamente
 * la referencia original `alertas`. Si contiene cambios, retorna un nuevo arreglo
 * sin alertas con estado `'resuelta'`, sin duplicados por `id` y ordenado por
 * `fechaHora` descendente.
 * Invariante: No muta el arreglo de entrada `alertas`; cada `id` aparece como
 * máximo una vez en el resultado.
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

  const resultado = [...porId.values()].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
  );

  asegurar(
    resultado.length === porId.size,
    'el resultado no debe contener elementos duplicados por id.'
  );
  asegurar(
    resultado.every((item) => item.estado !== 'resuelta'),
    'el resultado no debe incluir alertas resueltas.'
  );

  return resultado;
}

/**
 * Convierte una lista de alertas clínicas en notificaciones ordenadas de más reciente a más antigua.
 *
 * Pre: Cada elemento de `alertas` tiene `fechaHora` parseable por `Date`, `nivel` y `estado` definidos.
 * Post: Retorna un nuevo arreglo de igual longitud que `alertas`, ordenado por `fechaHora` descendente,
 * con `critica` en `true` solo cuando `nivel === 'Critica'` y `leida` en `true` cuando `estado !== 'activa'`.
 * Invariante: No muta el arreglo de entrada `alertas`.
 */
export function alertasANotificaciones(alertas: Alerta[]): Notificacion[] {
  const notificaciones = alertas
    .slice()
    .sort(
      (a, b) =>
        new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    )
    .map((alerta) => ({
      id: `alerta-${alerta.id}`,
      clave: `${alerta.id}:${alerta.nivel}`,
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
      ruta: `/alertas?alerta=${alerta.id}`,
    }));

  asegurar(
    notificaciones.length === alertas.length,
    'la cantidad de notificaciones debe coincidir con la cantidad de alertas.'
  );

  return notificaciones;
}

/** Operaciones del servicio REST de alertas clínicas. */
export const alertasService = {
  listar: listarAlertas,
  abiertas: listarAlertasAbiertas,
  reconocer: reconocerAlerta,
  resolver: resolverAlerta,
};
