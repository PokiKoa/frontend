import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/axios', () => ({
  obtenerAccessToken: vi.fn(() => 'token-1'),
  renovarAccessToken: vi.fn(() => Promise.resolve('token-2')),
}));

import { obtenerAccessToken, renovarAccessToken } from '@/api/axios';

import { ConexionTiempoReal } from './tiempoReal';

class SocketFalso {
  static creados: SocketFalso[] = [];
  readyState = 0;
  enviados: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((m: { data: string }) => void) | null = null;
  onclose: ((c: { code: number }) => void) | null = null;
  url: string;
  protocolos: string[];
  constructor(url: string, protocolos: string[]) {
    this.url = url;
    this.protocolos = protocolos;
    SocketFalso.creados.push(this);
  }
  send(datos: string) {
    this.enviados.push(datos);
  }
  close(code = 1000) {
    this.onclose?.({ code });
  }
  abrir() {
    this.readyState = 1;
    this.onopen?.();
  }
}

function conectar(alEvento = vi.fn(), alCambiarEstado = vi.fn()) {
  const conexion = new ConexionTiempoReal('/ws/v1/monitoring/stream/', {
    alEvento,
    alCambiarEstado,
    baseUrl: 'ws://test',
    crearSocket: (url, protocolos) =>
      new SocketFalso(url, protocolos) as unknown as WebSocket,
  });
  conexion.abrir();
  return { conexion, alEvento, alCambiarEstado };
}

describe('ConexionTiempoReal', () => {
  beforeEach(() => {
    SocketFalso.creados = [];
    vi.useFakeTimers();
    vi.mocked(obtenerAccessToken).mockReturnValue('token-1');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('se autentica con el subprotocolo bearer y entrega eventos sin el pong', () => {
    const { alEvento, alCambiarEstado } = conectar();
    const socket = SocketFalso.creados[0];
    expect(socket.url).toBe('ws://test/ws/v1/monitoring/stream/');
    expect(socket.protocolos).toEqual(['bearer', 'token-1']);

    socket.abrir();
    expect(alCambiarEstado).toHaveBeenLastCalledWith('conectado');
    socket.onmessage?.({ data: '{"event":"stream.pong"}' });
    socket.onmessage?.({ data: '{"event":"telemetry.reading","reading":{}}' });
    socket.onmessage?.({ data: 'no-json' });
    expect(alEvento).toHaveBeenCalledOnce();
    expect(alEvento.mock.calls[0][0].event).toBe('telemetry.reading');

    vi.advanceTimersByTime(25_000);
    expect(socket.enviados).toEqual(['{"action":"ping"}']);
  });

  it('reconecta con espera exponencial ante cortes de red', () => {
    conectar();
    SocketFalso.creados[0].close(1006);
    vi.advanceTimersByTime(999);
    expect(SocketFalso.creados).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(SocketFalso.creados).toHaveLength(2);

    SocketFalso.creados[1].close(1006);
    vi.advanceTimersByTime(1999);
    expect(SocketFalso.creados).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(SocketFalso.creados).toHaveLength(3);
  });

  it('ante 4401 renueva el token y reconecta con el nuevo', async () => {
    conectar();
    vi.mocked(obtenerAccessToken).mockReturnValue('token-2');
    SocketFalso.creados[0].close(4401);
    await vi.runAllTimersAsync();
    expect(renovarAccessToken).toHaveBeenCalledOnce();
    expect(SocketFalso.creados[1].protocolos).toEqual(['bearer', 'token-2']);
  });

  it('no reintenta ante 4403/4404 ni tras cerrar desde el cliente', () => {
    conectar();
    SocketFalso.creados[0].close(4403);
    const { conexion } = conectar();
    conexion.cerrar();
    vi.advanceTimersByTime(60_000);
    expect(SocketFalso.creados).toHaveLength(2);
  });
});
