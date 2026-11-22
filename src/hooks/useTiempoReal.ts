/**
 * @file useTiempoReal.ts
 * @description Suscribe un componente a un canal WebSocket del backend mientras
 * está montado. `ruta = null` desactiva la suscripción.
 */

import { useEffect, useRef, useState } from 'react';

import {
  ConexionTiempoReal,
  type EstadoConexion,
  type EventoTiempoReal,
} from '@/api/tiempoReal';

/**
 * Abre y mantiene activa una conexión WebSocket contra la ruta indicada mientras el
 * componente permanece montado. Actualiza el manejador de eventos mediante una referencia
 * interna para evitar reconexiones cuando cambia la función `alEvento`.
 *
 * @param ruta - Ruta relativa del canal WebSocket a suscribir, o `null` para mantener la suscripción inactiva.
 * @param alEvento - Callback invocado cada vez que llega un `EventoTiempoReal` desde el servidor.
 * @returns Estado actual de la conexión (`EstadoConexion`).
 */
export function useTiempoReal(
  ruta: string | null,
  alEvento: (evento: EventoTiempoReal) => void
): EstadoConexion {
  const [estado, setEstado] = useState<EstadoConexion>('desconectado');
  const oyente = useRef(alEvento);

  useEffect(() => {
    oyente.current = alEvento;
  });

  useEffect(() => {
    if (!ruta) return;
    const conexion = new ConexionTiempoReal(ruta, {
      alEvento: (evento) => oyente.current(evento),
      alCambiarEstado: setEstado,
    });
    conexion.abrir();
    return () => conexion.cerrar();
  }, [ruta]);

  return estado;
}
