/**
 * @file ToastContext.tsx
 * @description Notificaciones efímeras de la interfaz. Reemplaza los `alert`
 * nativos por mensajes no bloqueantes con cierre automático.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import './Toast.css';

/** Tipos de notificación admitidos. */
export type TipoToast = 'exito' | 'error' | 'info' | 'aviso';

/** Notificación activa en pantalla. */
interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

/** Contrato público del contexto de notificaciones. */
interface ToastContextValue {
  /** Muestra una notificación genérica. */
  mostrar: (mensaje: string, tipo?: TipoToast) => void;
  /** Muestra una notificación de éxito. */
  exito: (mensaje: string) => void;
  /** Muestra una notificación de error. */
  error: (mensaje: string) => void;
  /** Muestra una notificación informativa. */
  info: (mensaje: string) => void;
  /** Muestra una advertencia. */
  aviso: (mensaje: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Iconos textuales por tipo de notificación. */
const ICONOS: Record<TipoToast, string> = {
  exito: '✓',
  error: '!',
  info: 'i',
  aviso: '△',
};

/**
 * Proveedor de notificaciones efímeras.
 *
 * @param props - Componentes hijos de la aplicación.
 * @returns Proveedor y contenedor visual de notificaciones.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const secuencia = useRef(0);

  /**
   * Agrega una notificación y programa su retiro.
   *
   * @param mensaje - Texto a mostrar.
   * @param tipo - Tipo visual de la notificación.
   */
  const mostrar = useCallback((mensaje: string, tipo: TipoToast = 'info') => {
    secuencia.current += 1;
    const id = secuencia.current;
    setToasts((actuales) => [...actuales, { id, tipo, mensaje }]);
    window.setTimeout(() => {
      setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const valor = useMemo<ToastContextValue>(
    () => ({
      mostrar,
      exito: (mensaje: string) => mostrar(mensaje, 'exito'),
      error: (mensaje: string) => mostrar(mensaje, 'error'),
      info: (mensaje: string) => mostrar(mensaje, 'info'),
      aviso: (mensaje: string) => mostrar(mensaje, 'aviso'),
    }),
    [mostrar]
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.tipo} fade-in`}
            role="alert"
          >
            <span className="toast__icono" aria-hidden="true">
              {ICONOS[toast.tipo]}
            </span>
            <p className="toast__mensaje">{toast.mensaje}</p>
            <button
              type="button"
              className="toast__cerrar"
              aria-label="Cerrar notificación"
              onClick={() =>
                setToasts((actuales) =>
                  actuales.filter((item) => item.id !== toast.id)
                )
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook de acceso a las notificaciones.
 *
 * @throws Error si se usa fuera de `ToastProvider`.
 * @returns Acciones para mostrar notificaciones.
 */
export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  }
  return contexto;
}
