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
