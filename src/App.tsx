/**
 * @file App.tsx
 * @description Componente raíz: compone la caché de consultas, los proveedores de
 * sesión y de notificaciones con el enrutador principal.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';

import { queryClient } from '@/api/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import AppRouter from '@/routes/AppRouter';

/** Herramientas de depuración de la caché: solo se descargan en desarrollo. */
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((modulo) => ({
        default: modulo.ReactQueryDevtools,
      }))
    )
  : null;

/**
 * Raíz de la aplicación Poki Koa.
 *
 * @returns Árbol de proveedores y rutas.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
