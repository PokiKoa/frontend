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
 * @param oyente - Callback sin argumentos a invocar al expirar la sesión.
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

/**
 * Obtiene el access token JWT almacenado actualmente en memoria.
 *
 * @returns Cadena del token activo, o `null` si no hay sesión iniciada en memoria.
 */
export function obtenerAccessToken(): string | null {
  return accessToken;
}

/**
 * Almacena o limpia el access token JWT en memoria.
 *
 * @param token - Nuevo token de acceso recibido del backend, o `null` para limpiar la sesión.
 */
export function guardarAccessToken(token: string | null): void {
  accessToken = token;
}

/** Rutas cuyo 401 no debe disparar una renovación (evita bucles). */
const RUTAS_SIN_RENOVACION = ['/auth/login/', '/auth/refresh/'];

let renovacionEnCurso: Promise<string> | null = null;

/**
 * Pide un access token nuevo usando la cookie httpOnly de refresh.
 *
 * Las peticiones que reciben 401 de forma simultánea comparten una sola promesa
 * de renovación: el backend rota el refresh token en cada uso y una segunda
 * llamada concurrente enviaría un token ya revocado.
 *
 * @returns Promesa que resuelve con el nuevo access token almacenado en memoria.
 * @throws {AxiosError} Si el endpoint `/auth/refresh/` rechaza la renovación (ej. cookie expirada).
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

/**
 * Limpia el token en memoria y notifica a todos los oyentes suscritos de que la sesión expiró.
 */
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
 * Extrae un mensaje legible de un error del API o de red.
 *
 * El backend responde siempre `{"error": {"code", "message", "details"}}`; si
 * hay detalles por campo se muestra el primero, que es más específico que el
 * mensaje general.
 *
 * @param error - Error desconocido capturado en un bloque `catch`.
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
 * Obtiene los errores por campo del sobre del API para marcar controles de formularios.
 *
 * @param error - Error desconocido capturado en un bloque `catch`.
 * @returns Diccionario `campo -> primer mensaje` en español (vacío si no hay detalles).
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

/**
 * Extrae el primer mensaje de error disponible dentro del objeto `details` del backend.
 * Los nombres de campo del API están en inglés, por lo que solo se retorna el valor textual en español.
 *
 * @param detalles - Objeto `details` del sobre de error, o `undefined`.
 * @returns Primer mensaje textual encontrado, o cadena vacía si no existe ninguno.
 */
function primerDetalle(detalles: Record<string, unknown> | undefined): string {
  for (const valor of Object.values(detalles ?? {})) {
    const mensaje = textoDe(valor);
    if (mensaje) return mensaje;
  }
  return '';
}

/**
 * Extrae recursivamente el primer texto no vacío desde estructuras anidadas de validación (strings, arreglos u objetos).
 *
 * @param valor - Valor arbitrario dentro de `details`.
 * @returns Primera cadena encontrada, o cadena vacía si no contiene texto.
 */
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

/**
 * Extrae el código máquina de error del sobre del backend (`two_factor_required`, `conflict`, etc.).
 *
 * @param error - Error desconocido capturado en un bloque `catch`.
 * @returns Código de error del backend, o `null` si no es un error HTTP con sobre estructurado.
 */
export function obtenerCodigoError(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  return (error.response?.data as SobreError | undefined)?.error?.code ?? null;
}
