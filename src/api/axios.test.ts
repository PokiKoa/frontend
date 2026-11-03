import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  alExpirarSesion,
  api,
  guardarAccessToken,
  obtenerAccessToken,
  obtenerErroresCampos,
  obtenerMensajeError,
} from './axios';

type Respuesta = { status: number; data?: unknown };

function respuestaPara(
  config: Parameters<AxiosAdapter>[0],
  { status, data }: Respuesta
): Promise<AxiosResponse> {
  const respuesta = {
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
  } as AxiosResponse;
  if (status >= 400) {
    return Promise.reject(
      new AxiosError('error', String(status), config, null, respuesta)
    );
  }
  return Promise.resolve(respuesta);
}

describe('cliente HTTP', () => {
  const adaptadorOriginal = api.defaults.adapter;
  let llamadas: Array<{ url?: string; auth?: string }>;

  beforeEach(() => {
    llamadas = [];
    guardarAccessToken(null);
  });

  afterEach(() => {
    api.defaults.adapter = adaptadorOriginal;
  });

  function usarServidor(responder: (url: string) => Respuesta) {
    api.defaults.adapter = (config) => {
      llamadas.push({
        url: config.url,
        auth: config.headers?.Authorization as string | undefined,
      });
      return respuestaPara(config, responder(config.url ?? ''));
    };
  }

  it('envía el access token en memoria como Bearer', async () => {
    guardarAccessToken('abc');
    usarServidor(() => ({ status: 200, data: {} }));
    await api.get('/patients/');
    expect(llamadas[0].auth).toBe('Bearer abc');
  });

  it('ante 401 renueva una sola vez para peticiones concurrentes y reintenta', async () => {
    guardarAccessToken('vencido');
    let renovaciones = 0;
    usarServidor((url) => {
      if (url.includes('/auth/refresh/')) {
        renovaciones += 1;
        return { status: 200, data: { access: 'nuevo' } };
      }
      return llamadas.at(-1)?.auth === 'Bearer nuevo'
        ? { status: 200, data: { ok: true } }
        : { status: 401 };
    });

    const [a, b] = await Promise.all([
      api.get('/patients/'),
      api.get('/cribs/'),
    ]);
    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
    expect(renovaciones).toBe(1);
    expect(obtenerAccessToken()).toBe('nuevo');
  });

  it('si la renovación falla, expira la sesión', async () => {
    guardarAccessToken('vencido');
    const alExpirar = vi.fn();
    const cancelar = alExpirarSesion(alExpirar);
    usarServidor(() => ({ status: 401 }));

    await expect(api.get('/patients/')).rejects.toBeInstanceOf(AxiosError);
    expect(alExpirar).toHaveBeenCalledOnce();
    expect(obtenerAccessToken()).toBeNull();
    cancelar();
  });

  it('no intenta renovar cuando falla el propio login', async () => {
    usarServidor(() => ({ status: 401 }));
    await expect(api.post('/auth/login/', {})).rejects.toBeInstanceOf(
      AxiosError
    );
    expect(llamadas).toHaveLength(1);
  });
});

describe('mensajes de error', () => {
  function errorConDatos(status: number, data: unknown) {
    return new AxiosError('x', String(status), undefined, null, {
      status,
      data,
    } as AxiosResponse);
  }

  it('prefiere el primer detalle por campo del sobre del backend', () => {
    const error = errorConDatos(400, {
      error: {
        code: 'validation_error',
        message: 'Los datos enviados no son válidos.',
        details: {
          heart_rate: ['La frecuencia cardíaca debe estar entre 1 y 260 lpm.'],
        },
      },
    });
    expect(obtenerMensajeError(error)).toBe(
      'La frecuencia cardíaca debe estar entre 1 y 260 lpm.'
    );
    expect(obtenerErroresCampos(error)).toEqual({
      heart_rate: 'La frecuencia cardíaca debe estar entre 1 y 260 lpm.',
    });
  });

  it('usa el mensaje general si no hay detalles', () => {
    const error = errorConDatos(409, {
      error: { code: 'conflict', message: 'La dosis ya fue administrada.' },
    });
    expect(obtenerMensajeError(error)).toBe('La dosis ya fue administrada.');
  });

  it('informa cuando el backend no responde', () => {
    expect(obtenerMensajeError(new AxiosError('Network Error'))).toMatch(
      /No se pudo conectar/
    );
  });
});
