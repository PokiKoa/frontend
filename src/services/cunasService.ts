/**
 * @file cunasService.ts
 * @description Cunas de la unidad: estado en vivo, asignación de pacientes y mantenimiento.
 */

import { api } from '@/api/axios';
import { aplicarLectura, mapCuna } from '@/api/mappers/cunas';
import type { EventoTiempoReal } from '@/api/tiempoReal';
import type { Api } from '@/api/tipos';
import type { Cuna, EstadoCuna } from '@/types/cuna';

/** Cunas con paciente, última lectura y alertas abiertas en una sola consulta. */
export async function listarCunas(): Promise<Cuna[]> {
  const { data } = await api.get<Api['UnitOverview']>('/monitoring/overview/');
  return data.cribs.map(mapCuna);
}

export async function asignarPaciente(
  cunaId: number,
  pacienteId: number
): Promise<void> {
  await api.post(`/cribs/${cunaId}/assign-patient/`, {
    patient_id: pacienteId,
  });
}

export async function liberarCuna(cunaId: number): Promise<void> {
  await api.post(`/cribs/${cunaId}/release/`);
}

/** Solo para cunas sin paciente: el backend rechaza el cambio si hay un paciente asignado. */
export async function cambiarMantenimiento(
  cunaId: number,
  enMantenimiento: boolean
): Promise<void> {
  await api.patch(`/cribs/${cunaId}/`, {
    status: enMantenimiento ? 'maintenance' : 'available',
  });
}

/**
 * Actualiza en memoria la cuna de una lectura recibida por WebSocket.
 *
 * @returns `null` si el evento requiere recargar el resumen (cambios de alertas o de estado).
 */
export function aplicarEventoCunas(
  cunas: Cuna[],
  evento: EventoTiempoReal
): Cuna[] | null {
  if (evento.event !== 'telemetry.reading') {
    return evento.event.startsWith('alert.') ? null : cunas;
  }
  const lectura = evento.reading as Api['VitalSignReading'] | undefined;
  const cuna = cunas.find((c) => c.id === evento.crib_id);
  if (!lectura || !cuna) return cunas;

  const activas = (evento.active_alerts as Api['Alert'][] | undefined) ?? [];
  const resueltas =
    (evento.auto_resolved_alerts as Api['Alert'][] | undefined) ?? [];
  const aparecioAlerta = activas.length > 0 && cuna.alertasAbiertas === 0;
  // Una cuna offline cambia de estado al volver a transmitir y las alertas cambian sus conteos: se recarga
  if (cuna.estado === 'fuera_linea' || resueltas.length > 0 || aparecioAlerta) {
    return null;
  }
  return cunas.map((c) =>
    c.id === cuna.id
      ? {
          ...aplicarLectura(c, lectura),
          tieneAlertaCritica:
            c.tieneAlertaCritica ||
            activas.some((a) => a.severity === 'critical'),
        }
      : c
  );
}

export function resumirCunas(cunas: Cuna[]): Record<EstadoCuna, number> {
  const resumen: Record<EstadoCuna, number> = {
    disponible: 0,
    ocupada: 0,
    mantenimiento: 0,
    fuera_linea: 0,
  };
  for (const cuna of cunas) resumen[cuna.estado] += 1;
  return resumen;
}

export const cunasService = {
  listar: listarCunas,
  asignarPaciente,
  liberar: liberarCuna,
  cambiarMantenimiento,
  resumir: resumirCunas,
};
