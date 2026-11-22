/**
 * @file MainLayout.tsx
 * @description Estructura base de las pantallas privadas: sidebar, cabecera y área de contenido.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Header from './Header';
import Sidebar from './Sidebar';

import './Layout.css';

/**
 * Renderiza el contenedor principal de las vistas autenticadas, coordinando
 * la apertura del menú lateral móvil (`Sidebar`), la barra superior (`Header`)
 * y el área de contenido dinámico (`Outlet`).
 *
 * @returns Estructura HTML del layout principal con navegación y vista activa.
 */
export default function MainLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="layout">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="layout__principal">
        <Header onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="layout__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}