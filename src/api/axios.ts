/**
 * @file axios.ts
 * @description Cliente HTTP único contra el backend v2 (`/api/v1`). El access
 * token vive solo en memoria; el refresh token viaja en una cookie httpOnly que
 * el navegador adjunta sola, de modo que ningún script puede leerlo.
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const oyentesExpiracion = new Set<() => void>();

/**
 * Suscribe una función que se ejecuta cuando la sesión ya no puede renovarse.
 *
 * @returns Función para cancelar la suscripción.
 */
export function alExpirarSesion(oyente: () => void): () => void {
  oyentesExpiracion.add(oyente);
  return () => oyentesExpiracion.delete(oyente);
}

/** Ruta base del API; en desarrollo pasa por el proxy de Vite (mismo origen). */
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let accessToken: string | null = null;

export function obtenerAccessToken(): string | null {
  return accessToken;
}

export function guardarAccessToken(token: string | null): void {
  accessToken = token;
}

/** Rutas cuyo 401 no debe disparar una renovación (evita bucles). */
const RUTAS_SIN_RENOVACION = ['/auth/login/', '/auth/refresh/'];

let renovacionEnCurso: Promise<string> | null = null;

/**
 * Pide un access token nuevo usando la cookie de refresh.
 *
 * Las peticiones que reciben 401 a la vez comparten una sola renovación: el
 * backend rota el refresh en cada uso y una segunda llamada concurrente usaría
 * un token ya revocado.
 */
export function renovarAccessToken(): Promise<string> {
  renovacionEnCurso ??= api
    .post<{ access: string }>('/auth/refresh/')
    .then(({ data }) => {
      guardarAccessToken(data.access);
      return data.access;
    })
    .finally(() => {
      renovacionEnCurso = null;
    });
  return renovacionEnCurso;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type ConfigReintentable = InternalAxiosRequestConfig & { _reintento?: boolean };

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: AxiosError) => {
    const config = error.config as ConfigReintentable | undefined;
    const excluida = RUTAS_SIN_RENOVACION.some((ruta) =>
      config?.url?.includes(ruta)
    );

    if (error.response?.status !== 401 || !config || excluida) {
      return Promise.reject(error);
    }
    if (config._reintento) {
      expirarSesion();
      return Promise.reject(error);
    }

    try {
      await renovarAccessToken();
    } catch {
      expirarSesion();
      return Promise.reject(error);
    }
    config._reintento = true;
    return api(config);
  }
);

function expirarSesion(): void {
  guardarAccessToken(null);
  oyentesExpiracion.forEach((oyente) => oyente());
}

interface SobreError {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Extrae un mensaje legible de un error del API.
 *
 * El backend responde siempre `{"error": {"code", "message", "details"}}`; si
 * hay detalles por campo se muestra el primero, que es más específico que el
 * mensaje general.
 *
 * @param error - Error desconocido capturado en un `catch`.
 * @returns Mensaje en español listo para mostrarse en la interfaz.
 */
export function obtenerMensajeError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message) return error.message;
    return 'Ocurrió un error inesperado. Intenta nuevamente.';
  }
  if (error.code === 'ECONNABORTED') {
    return 'La solicitud tardó demasiado. Verifica la conexión con el servidor.';
  }
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';
  }

  const sobre = (error.response.data as SobreError | undefined)?.error;
  const detalle = primerDetalle(sobre?.details);
  if (detalle) return detalle;
  if (sobre?.message) return sobre.message;

  return `Error ${error.response.status}: no fue posible completar la operación.`;
}

/**
 * Obtiene los errores por campo del sobre del API, para marcar formularios.
 *
 * @param error - Error capturado.
 * @returns Mapa campo → primer mensaje.
 */
export function obtenerErroresCampos(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const detalles = (error.response?.data as SobreError | undefined)?.error
    ?.details;
  const errores: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(detalles ?? {})) {
    const mensaje = textoDe(valor);
    if (mensaje) errores[campo] = mensaje;
  }
  return errores;
}

// Los nombres de campo del API están en inglés: se muestra solo el mensaje, ya en español
function primerDetalle(detalles: Record<string, unknown> | undefined): string {
  for (const valor of Object.values(detalles ?? {})) {
    const mensaje = textoDe(valor);
    if (mensaje) return mensaje;
  }
  return '';
}

function textoDe(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) {
    for (const elemento of valor) {
      const texto = textoDe(elemento);
      if (texto) return texto;
    }
  }
  if (valor && typeof valor === 'object') {
    return primerDetalle(valor as Record<string, unknown>);
  }
  return '';
}

/** Código de error del sobre del backend (`two_factor_required`, `conflict`, …). */
export function obtenerCodigoError(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  return (error.response?.data as SobreError | undefined)?.error?.code ?? null;
}
