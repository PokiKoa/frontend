/**
 * @file tiempoReal.ts
 * @description Conexión WebSocket autenticada con el backend (`/ws/v1/...`).
 * El access token viaja como subprotocolo `["bearer", token]` porque los
 * navegadores no permiten cabeceras en WebSocket y la URL quedaría en logs.
 */

import { obtenerAccessToken, renovarAccessToken } from '@/api/axios';

export type EstadoConexion = 'conectando' | 'conectado' | 'desconectado';

/** Evento JSON emitido por el backend (`telemetry.reading`, `alert.resolved`, …). */
export interface EventoTiempoReal {
  event: string;
  [clave: string]: unknown;
}

const CIERRE_NO_AUTENTICADO = 4401;
const CIERRES_DEFINITIVOS = new Set([4403, 4404]);
const INTERVALO_PING_MS = 25_000;
const ESPERA_MAXIMA_MS = 30_000;

type FabricaSocket = (url: string, protocolos: string[]) => WebSocket;

interface Opciones {
  alEvento: (evento: EventoTiempoReal) => void;
  alCambiarEstado?: (estado: EstadoConexion) => void;
  crearSocket?: FabricaSocket;
  baseUrl?: string;
}

export function urlTiempoReal(ruta: string, base?: string): string {
  const origen =
    base ||
    import.meta.env.VITE_WS_URL ||
    `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
  return `${origen.replace(/\/$/, '')}${ruta}`;
}

/**
 * Mantiene una suscripción viva: reconecta con espera exponencial, renueva el
 * token ante un cierre 4401 y no reintenta ante 4403 (rol) o 4404 (recurso).
 */
export class ConexionTiempoReal {
  private socket: WebSocket | null = null;
  private intentos = 0;
  private cerradaPorCliente = false;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private readonly crearSocket: FabricaSocket;

  private readonly ruta: string;
  private readonly opciones: Opciones;

  constructor(ruta: string, opciones: Opciones) {
    this.ruta = ruta;
    this.opciones = opciones;
    this.crearSocket =
      opciones.crearSocket ??
      ((url, protocolos) => new WebSocket(url, protocolos));
  }

  abrir(): void {
    this.cerradaPorCliente = false;
    const token = obtenerAccessToken();
    if (!token) {
      void this.renovarYReconectar();
      return;
    }

    this.opciones.alCambiarEstado?.('conectando');
    const socket = this.crearSocket(
      urlTiempoReal(this.ruta, this.opciones.baseUrl),
      ['bearer', token]
    );
    this.socket = socket;

    socket.onopen = () => {
      this.intentos = 0;
      this.opciones.alCambiarEstado?.('conectado');
      this.ping = setInterval(() => {
        if (socket.readyState === 1)
          socket.send(JSON.stringify({ action: 'ping' }));
      }, INTERVALO_PING_MS);
    };

    socket.onmessage = (mensaje) => {
      try {
        const evento = JSON.parse(String(mensaje.data)) as EventoTiempoReal;
        if (evento.event !== 'stream.pong') this.opciones.alEvento(evento);
      } catch {
        // Un mensaje malformado no debe cortar la suscripción
      }
    };

    socket.onclose = (cierre) => {
      this.limpiarPing();
      this.socket = null;
      this.opciones.alCambiarEstado?.('desconectado');
      if (this.cerradaPorCliente || CIERRES_DEFINITIVOS.has(cierre.code))
        return;
      if (cierre.code === CIERRE_NO_AUTENTICADO) {
        void this.renovarYReconectar();
        return;
      }
      this.programarReconexion();
    };
  }

  cerrar(): void {
    this.cerradaPorCliente = true;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.limpiarPing();
    this.socket?.close(1000);
    this.socket = null;
  }

  private async renovarYReconectar(): Promise<void> {
    try {
      await renovarAccessToken();
    } catch {
      // Sin sesión renovable no se insiste: el cliente HTTP ya avisó la expiración
      this.opciones.alCambiarEstado?.('desconectado');
      return;
    }
    if (!this.cerradaPorCliente) this.programarReconexion(0);
  }

  private programarReconexion(espera?: number): void {
    const retraso =
      espera ?? Math.min(1000 * 2 ** this.intentos, ESPERA_MAXIMA_MS);
    this.intentos += 1;
    this.temporizador = setTimeout(() => this.abrir(), retraso);
  }

  private limpiarPing(): void {
    if (this.ping) clearInterval(this.ping);
    this.ping = null;
  }
}
