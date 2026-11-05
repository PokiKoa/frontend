import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import {
  GC_TIME_MS,
  MAX_REINTENTOS_LECTURA,
  STALE_TIME_MS,
  crearQueryClient,
  debeReintentarLectura,
} from './queryClient';

function errorHttp(status: number): AxiosError {
  const respuesta = { status, data: {} } as AxiosResponse;
  return new AxiosError('error', String(status), undefined, null, respuesta);
}

describe('crearQueryClient', () => {
  it('aplica los valores globales de caché a las lecturas', () => {
    const { queries } = crearQueryClient().getDefaultOptions();
    expect(queries?.staleTime).toBe(STALE_TIME_MS);
    expect(queries?.gcTime).toBe(GC_TIME_MS);
    expect(queries?.refetchOnWindowFocus).toBe(true);
    expect(queries?.retry).toBe(debeReintentarLectura);
  });

  it('nunca reintenta escrituras', () => {
    expect(crearQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('entrega una caché aislada por cliente', () => {
    const a = crearQueryClient();
    const b = crearQueryClient();
    a.setQueryData(['x'], 1);
    expect(b.getQueryData(['x'])).toBeUndefined();
  });
});

describe('debeReintentarLectura', () => {
  it('reintenta fallos de red hasta el máximo', () => {
    const sinRespuesta = new AxiosError('Network Error');
    expect(debeReintentarLectura(0, sinRespuesta)).toBe(true);
    expect(
      debeReintentarLectura(MAX_REINTENTOS_LECTURA - 1, sinRespuesta)
    ).toBe(true);
    expect(debeReintentarLectura(MAX_REINTENTOS_LECTURA, sinRespuesta)).toBe(
      false
    );
  });

  it('reintenta errores 5xx', () => {
    expect(debeReintentarLectura(0, errorHttp(503))).toBe(true);
  });

  it.each([400, 401, 403, 404, 409])(
    'no reintenta el error %i, que reintentar no corrige',
    (status) => {
      expect(debeReintentarLectura(0, errorHttp(status))).toBe(false);
    }
  );
});
