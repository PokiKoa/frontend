/**
 * @file AppRouter.tsx
 * @description Rutas de Poki Koa. El acceso es público; el resto de pantallas
 * quedan bajo el guardián de sesión y el layout privado, y cada una exige que
 * el rol tenga acceso (utils/roles.ts).
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import RutaProtegida from '@/components/auth/RutaProtegida';
import MainLayout from '@/components/layout/MainLayout';
import Spinner from '@/components/ui/Spinner/Spinner';
import LoginPage from '@/pages/login/LoginPage';
import NotFoundPage from '@/pages/notfound/NotFoundPage';

// Las pantallas privadas se cargan bajo demanda: el paquete inicial solo trae el acceso y el layout
const PaginaInicio = lazy(() => import('@/pages/inicio/PaginaInicio'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner bloque texto="Cargando la aplicación…" />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RutaProtegida />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<PaginaInicio />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
