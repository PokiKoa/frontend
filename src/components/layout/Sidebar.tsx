/**
 * @file Sidebar.tsx
 * @description Navegación lateral con menú por rol, identidad institucional y
 * tarjeta del usuario autenticado.
 */

import { NavLink } from 'react-router-dom';

import Icono, { type NombreIcono } from '@/components/ui/Iconos/Iconos';
import { useAuth } from '@/context/AuthContext';
import { ETIQUETA_TURNO } from '@/api/mappers/auth';
import { etiquetaRol, puedeVer, type Pantalla } from '@/utils/roles';

import './Sidebar.css';

/** Elemento de navegación. */
interface ItemNav {
  etiqueta: string;
  ruta: string;
  icono: NombreIcono;
  exacto?: boolean;
  pantalla: Pantalla;
}

/** Grupo de navegación. */
interface GrupoNav {
  titulo: string;
  items: ItemNav[];
}

/** Configuración del menú. */
const GRUPOS: GrupoNav[] = [
  {
    titulo: 'Clínica',
    items: [
      {
        etiqueta: 'Panel general',
        ruta: '/',
        icono: 'panel',
        exacto: true,
        pantalla: 'panel',
      },
      {
        etiqueta: 'Mapa de cunas',
        ruta: '/mapa',
        icono: 'cunas',
        pantalla: 'mapa',
      },
      {
        etiqueta: 'Mis cunas',
        ruta: '/mis-cunas',
        icono: 'misCunas',
        pantalla: 'misCunas',
      },
      {
        etiqueta: 'Pacientes',
        ruta: '/pacientes',
        icono: 'pacientes',
        pantalla: 'pacientes',
      },
      {
        etiqueta: 'Medicamentos',
        ruta: '/medicamentos',
        icono: 'medicamentos',
        pantalla: 'medicamentos',
      },
      {
        etiqueta: 'Planes de cuidado',
        ruta: '/planes',
        icono: 'planes',
        pantalla: 'planes',
      },
    ],
  },
  {
    titulo: 'Operación',
    items: [
      {
        etiqueta: 'Alertas',
        ruta: '/alertas',
        icono: 'alertas',
        pantalla: 'alertas',
      },
      {
        etiqueta: 'Turnos',
        ruta: '/turnos',
        icono: 'turnos',
        pantalla: 'turnos',
      },
      {
        etiqueta: 'Reportes',
        ruta: '/reportes',
        icono: 'reportes',
        pantalla: 'reportes',
      },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      {
        etiqueta: 'Auditoría',
        ruta: '/registros',
        icono: 'registros',
        pantalla: 'registros',
      },
      {
        etiqueta: 'Configuración',
        ruta: '/configuracion',
        icono: 'configuracion',
        pantalla: 'configuracion',
      },
    ],
  },
];

/** Propiedades del sidebar. */
interface SidebarProps {
  /** Indica si está abierto en móvil. */
  abierto: boolean;
  /** Cierra el panel móvil. */
  onCerrar: () => void;
}

/**
 * Barra lateral de navegación.
 *
 * @param props - Estado móvil y cierre.
 * @returns Panel lateral con menú y tarjeta de usuario.
 */
export default function Sidebar({ abierto, onCerrar }: SidebarProps) {
  const { usuario, cerrarSesion } = useAuth();
  const nombre = usuario?.nombreCompleto || usuario?.username || 'Usuario';
  const iniciales = usuario?.iniciales || 'PK';

  return (
    <>
      {abierto && (
        <div
          className="sidebar-overlay"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar${abierto ? ' sidebar--abierto' : ''}`}
        aria-label="Navegación principal"
      >
        <div className="sidebar__marca">
          <div className="sidebar__logo" aria-hidden="true">
            PK
          </div>
          <div>
            <p className="sidebar__nombre">Poki Koa</p>
            <p className="sidebar__subtitulo">Unidad neonatal</p>
          </div>
          <button
            type="button"
            className="sidebar__cerrar-movil"
            onClick={onCerrar}
            aria-label="Cerrar menú"
          >
            <Icono nombre="cerrar" tamano={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {GRUPOS.map((grupo) => {
            const items = grupo.items.filter((item) =>
              puedeVer(usuario, item.pantalla)
            );

            if (items.length === 0) return null;

            return (
              <div className="sidebar__grupo" key={grupo.titulo}>
                <p className="sidebar__grupo-titulo">{grupo.titulo}</p>
                {items.map((item) => (
                  <NavLink
                    key={item.ruta}
                    to={item.ruta}
                    end={item.exacto}
                    onClick={onCerrar}
                    className={({ isActive }) =>
                      `sidebar__enlace${
                        isActive ? ' sidebar__enlace--activo' : ''
                      }`
                    }
                  >
                    <Icono nombre={item.icono} tamano={17} />
                    <span>{item.etiqueta}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar__pie">
          <div className="sidebar__usuario">
            <div className="sidebar__avatar" aria-hidden="true">
              {iniciales}
            </div>
            <div className="sidebar__usuario-info">
              <p className="sidebar__usuario-nombre">{nombre}</p>
              <p className="sidebar__usuario-rol">
                <span className="sidebar__punto" aria-hidden="true" />
                {etiquetaRol(usuario?.rol)}
                {usuario?.turno ? ` · ${ETIQUETA_TURNO[usuario.turno]}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="sidebar__salir"
              onClick={() => {
                void cerrarSesion();
              }}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <Icono nombre="salir" tamano={17} />
            </button>
          </div>
          <p className="sidebar__version">Poki Koa · v2.0</p>
        </div>
      </aside>
    </>
  );
}
