/**
 * @file AppRouter.tsx
 * @description Rutas de Poki Koa. El acceso es público; el resto de pantallas
 * quedan bajo el guardián de sesión y el layout privado, y cada una exige que
 * el rol tenga acceso a su pantalla (utils/roles.ts).
 */

import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import RutaProtegida from '@/components/auth/RutaProtegida';
import MainLayout from '@/components/layout/MainLayout';
import Spinner from '@/components/ui/Spinner/Spinner';
import LoginPage from '@/pages/login/LoginPage';
import NotFoundPage from '@/pages/notfound/NotFoundPage';
import type { Pantalla } from '@/utils/roles';

interface RutaPrivada {
  ruta: string;
  pantalla: Pantalla;
  Componente: LazyExoticComponent<ComponentType>;
}

// Carga bajo demanda: el paquete inicial solo trae el acceso y el layout
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const MapaCunasPage = lazy(() => import('@/pages/mapa/MapaCunasPage'));
const PacientesPage = lazy(() => import('@/pages/pacientes/PacientesPage'));
const PacienteFormPage = lazy(
  () => import('@/pages/pacientes/PacienteFormPage')
);
const PacienteDetallePage = lazy(
  () => import('@/pages/pacientes/PacienteDetallePage')
);
const PlanesPage = lazy(() => import('@/pages/planes/PlanesPage'));
const MedicamentosPage = lazy(
  () => import('@/pages/medicamentos/MedicamentosPage')
);
const AlertasPage = lazy(() => import('@/pages/alertas/AlertasPage'));
const TurnosPage = lazy(() => import('@/pages/turnos/TurnosPage'));
const MisCunasPage = lazy(() => import('@/pages/turnos/MisCunasPage'));
const ReportesPage = lazy(() => import('@/pages/reportes/ReportesPage'));
const RegistrosPage = lazy(() => import('@/pages/registros/RegistrosPage'));
const ConfiguracionPage = lazy(
  () => import('@/pages/configuracion/ConfiguracionPage')
);

const RUTAS: RutaPrivada[] = [
  { ruta: '/', pantalla: 'panel', Componente: DashboardPage },
  { ruta: '/mapa', pantalla: 'mapa', Componente: MapaCunasPage },
  { ruta: '/pacientes', pantalla: 'pacientes', Componente: PacientesPage },
  {
    ruta: '/pacientes/nuevo',
    pantalla: 'pacientes',
    Componente: PacienteFormPage,
  },
  {
    ruta: '/pacientes/:id',
    pantalla: 'pacientes',
    Componente: PacienteDetallePage,
  },
  {
    ruta: '/pacientes/:id/editar',
    pantalla: 'pacientes',
    Componente: PacienteFormPage,
  },
  { ruta: '/planes', pantalla: 'planes', Componente: PlanesPage },
  {
    ruta: '/medicamentos',
    pantalla: 'medicamentos',
    Componente: MedicamentosPage,
  },
  { ruta: '/alertas', pantalla: 'alertas', Componente: AlertasPage },
  { ruta: '/turnos', pantalla: 'turnos', Componente: TurnosPage },
  { ruta: '/mis-cunas', pantalla: 'misCunas', Componente: MisCunasPage },
  { ruta: '/reportes', pantalla: 'reportes', Componente: ReportesPage },
  { ruta: '/registros', pantalla: 'registros', Componente: RegistrosPage },
  {
    ruta: '/configuracion',
    pantalla: 'configuracion',
    Componente: ConfiguracionPage,
  },
];

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner bloque texto="Cargando la aplicación…" />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RutaProtegida />}>
            <Route element={<MainLayout />}>
              {RUTAS.map(({ ruta, pantalla, Componente }) => (
                <Route
                  key={ruta}
                  element={<RutaProtegida pantalla={pantalla} />}
                >
                  <Route path={ruta} element={<Componente />} />
                </Route>
              ))}
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
