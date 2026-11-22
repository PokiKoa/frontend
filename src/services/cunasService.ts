/**
 * @file cunasService.ts
 * @description Cunas de la unidad: estado en vivo, asignación de pacientes y mantenimiento.
 */

import { api } from '@/api/axios';
import { aplicarLectura, mapCuna, mapCunaQr } from '@/api/mappers/cunas';
import type { EventoTiempoReal } from '@/api/tiempoReal';
import type { Api, Paginado } from '@/api/tipos';
import type { Cuna, CunaQr, EstadoCuna } from '@/types/cuna';

/**
 * Verifica una condición de invariante en tiempo de ejecución y lanza un error
 * descriptivo si se rompe.
 *
 * @param condicion - Expresión booleana que debe cumplirse.
 * @param mensaje - Motivo del fallo de aserción.
 */
function asegurar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new Error(`Fallo de aserción en cunasService: ${mensaje}`);
  }
}

/**
 * Obtiene todas las cunas de la unidad con su paciente asignado, última lectura
 * y conteo de alertas abiertas en una sola consulta.
 *
 * @returns Lista de cunas mapeadas al modelo de dominio.
 */
export async function listarCunas(): Promise<Cuna[]> {
  const { data } = await api.get<Api['UnitOverview']>('/monitoring/overview/');
  return data.cribs.map(mapCuna);
}

/**
 * Busca una cuna por su código exacto (correspondiente a su etiqueta QR).
 * Valida coincidencia exacta en cliente para evitar abrir otra ficha si el filtro
 * del servidor no aplica.
 *
 * @param codigo - Código identificador exacto de la cuna.
 * @returns Datos básicos de la cuna o `null` si no existe coincidencia exacta.
 */
export async function buscarCunaPorCodigo(
  codigo: string
): Promise<CunaQr | null> {
  const { data } = await api.get<Paginado<Api['Crib']>>('/cribs/', {
    params: { code: codigo },
  });
  const cuna = data.results.find((item) => item.code === codigo);
  return cuna ? mapCunaQr(cuna) : null;
}

/**
 * Asigna un paciente activo a una cuna disponible.
 *
 * @param cunaId - Identificador numérico de la cuna.
 * @param pacienteId - Identificador numérico del paciente.
 */
export async function asignarPaciente(
  cunaId: number,
  pacienteId: number
): Promise<void> {
  await api.post(`/cribs/${cunaId}/assign-patient/`, {
    patient_id: pacienteId,
  });
}

/**
 * Libera una cuna ocupada egresando o desvinculando su paciente actual.
 *
 * @param cunaId - Identificador numérico de la cuna a liberar.
 */
export async function liberarCuna(cunaId: number): Promise<void> {
  await api.post(`/cribs/${cunaId}/release/`);
}

/**
 * Intercambia los pacientes asignados entre dos cunas ocupadas sin generar egreso.
 *
 * @param cunaId - Identificador numérico de la primera cuna.
 * @param otraCunaId - Identificador numérico de la segunda cuna.
 */
export async function intercambiarCunas(
  cunaId: number,
  otraCunaId: number
): Promise<void> {
  await api.post(`/cribs/${cunaId}/swap/`, { other_crib_id: otraCunaId });
}

/**
 * Cambia el estado operativo de una cuna libre entre mantenimiento y disponible.
 * El backend rechaza la operación si la cuna tiene un paciente asignado.
 *
 * @param cunaId - Identificador numérico de la cuna.
 * @param enMantenimiento - `true` para ponerla en mantenimiento; `false` para habilitarla.
 */
export async function cambiarMantenimiento(
  cunaId: number,
  enMantenimiento: boolean
): Promise<void> {
  await api.patch(`/cribs/${cunaId}/`, {
    status: enMantenimiento ? 'maintenance' : 'available',
  });
}

/**
 * Aplica en memoria un evento del WebSocket sobre el listado actual de cunas o
 * indica si es necesario recargar el resumen completo de la unidad.
 *
 * Pre: `cunas` contiene cunas con `id` único y `alertasAbiertas >= 0`; `evento` es un
 * mensaje válido de tiempo real.
 * Post: Retorna `null` si el evento es de tipo `'alert.*'` o si una lectura implica
 * reconexión desde `'fuera_linea'`, alertas resueltas o aparición de alertas en una cuna
 * sin alertas previas. Retorna la referencia `cunas` sin cambios si el evento no afecta
 * a ninguna cuna listada. En caso contrario, retorna un nuevo arreglo de igual longitud
 * con la lectura aplicada sobre la cuna destino y `tieneAlertaCritica` actualizado.
 * Invariante: No muta `cunas` ni sus elementos; conserva intactos la longitud del listado,
 * el orden y el `id` de cada cuna.
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

  if (cuna.estado === 'fuera_linea' || resueltas.length > 0 || aparecioAlerta) {
    return null;
  }

  const resultado = cunas.map((c) =>
    c.id === cuna.id
      ? {
          ...aplicarLectura(c, lectura),
          tieneAlertaCritica:
            c.tieneAlertaCritica ||
            activas.some((a) => a.severity === 'critical'),
        }
      : c
  );

  asegurar(
    resultado.length === cunas.length,
    'el total de cunas no debe variar al aplicar una lectura en vivo.'
  );

  return resultado;
}

/**
 * Calcula el conteo total de cunas agrupado por su estado operativo.
 *
 * Pre: Cada elemento de `cunas` posee un `estado` válido de `EstadoCuna`.
 * Post: Retorna un registro con las cuatro claves de `EstadoCuna` (`disponible`,
 * `ocupada`, `mantenimiento`, `fuera_linea`), donde cada contador es entero no negativo
 * y la suma de los cuatro valores es exactamente `cunas.length`.
 * Invariante: No muta el arreglo de entrada `cunas`.
 */
export function resumirCunas(cunas: Cuna[]): Record<EstadoCuna, number> {
  const resumen: Record<EstadoCuna, number> = {
    disponible: 0,
    ocupada: 0,
    mantenimiento: 0,
    fuera_linea: 0,
  };
  for (const cuna of cunas) resumen[cuna.estado] += 1;

  const totalContado =
    resumen.disponible +
    resumen.ocupada +
    resumen.mantenimiento +
    resumen.fuera_linea;

  asegurar(
    totalContado === cunas.length,
    'la suma de cunas por estado debe coincidir con el total de cunas.'
  );

  return resumen;
}

/** Operaciones del servicio de cunas de la unidad. */
export const cunasService = {
  listar: listarCunas,
  buscarPorCodigo: buscarCunaPorCodigo,
  asignarPaciente,
  liberar: liberarCuna,
  intercambiar: intercambiarCunas,
  cambiarMantenimiento,
  resumir: resumirCunas,
};