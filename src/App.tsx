/**
 * @file App.tsx
 * @description Componente raíz: compone los proveedores de sesión y de
 * notificaciones con el enrutador principal.
 */

import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import AppRouter from '@/routes/AppRouter';

/**
 * Raíz de la aplicación Poki Koa.
 *
 * @returns Árbol de proveedores y rutas.
 */
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}
