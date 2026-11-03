/**
 * @file Header.tsx
 * @description Barra superior: contexto de la sección, reloj institucional,
 * notificaciones de alertas activas y acceso rápido al perfil.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Icono from '@/components/ui/Iconos/Iconos';
import { useAuth } from '@/context/AuthContext';
import {
  alertasANotificaciones,
  alertasService,
} from '@/services/alertasService';
import type { Notificacion } from '@/types/alerta';
import { tiempoRelativo } from '@/utils/fechas';
import { etiquetaRol, nombreVisible } from '@/utils/roles';

import './Layout.css';

/** Propiedades del header. */
interface HeaderProps {
  /** Abre el menú lateral en móvil. */
  onAbrirMenu: () => void;
}

/** Títulos por prefijo de ruta. */
const TITULOS: Array<{ prefijo: string; titulo: string }> = [
  { prefijo: '/pacientes', titulo: 'Pacientes' },
  { prefijo: '/medicamentos', titulo: 'Medicamentos' },
  { prefijo: '/planes', titulo: 'Planes de cuidado' },
  { prefijo: '/mapa', titulo: 'Mapa de cunas' },
  { prefijo: '/mis-cunas', titulo: 'Mis cunas' },
  { prefijo: '/alertas', titulo: 'Alertas clínicas' },
  { prefijo: '/turnos', titulo: 'Turnos y asignaciones' },
  { prefijo: '/reportes', titulo: 'Reportes' },
  { prefijo: '/registros', titulo: 'Auditoría' },
  { prefijo: '/configuracion', titulo: 'Configuración' },
  { prefijo: '/', titulo: 'Panel general' },
];

/**
 * Cabecera principal.
 *
 * @param props - Acción para abrir el menú móvil.
 * @returns Barra superior con reloj y notificaciones.
 */
export default function Header({ onAbrirMenu }: HeaderProps) {
  const { usuario, perfil } = useAuth();
  const ubicacion = useLocation();
  const navegar = useNavigate();

  const [ahora, setAhora] = useState(() => new Date());
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const titulo = useMemo(() => {
    const encontrado = TITULOS.find(
      (item) =>
        ubicacion.pathname === item.prefijo ||
        (item.prefijo !== '/' && ubicacion.pathname.startsWith(item.prefijo))
    );
    return encontrado?.titulo ?? 'Poki Koa';
  }, [ubicacion.pathname]);

  // Reloj local actualizado cada minuto.
  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(new Date()), 30000);
    return () => window.clearInterval(intervalo);
  }, []);

  // Alertas activas como fuente de notificaciones (refresco cada minuto).
  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      try {
        const alertas = await alertasService.activas();
        if (vigente) setNotificaciones(alertasANotificaciones(alertas));
      } catch {
        // Sin conexión: se conserva la última lista disponible.
      }
    };

    void cargar();
    const intervalo = window.setInterval(() => void cargar(), 60000);

    return () => {
      vigente = false;
      window.clearInterval(intervalo);
    };
  }, []);

  const criticas = notificaciones.filter((item) => item.critica).length;
  const nombre = nombreVisible(usuario, perfil);
  const iniciales =
    perfil?.iniciales?.trim() || usuario?.iniciales?.trim() || 'PK';
  const rol = etiquetaRol(perfil?.rol ?? usuario?.rol ?? null);

  const fecha = new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(ahora);
  const hora = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(ahora);

  return (
    <header className="cabecera">
      <div className="cabecera__izquierda">
        <button
          type="button"
          className="cabecera__menu"
          onClick={onAbrirMenu}
          aria-label="Abrir menú"
        >
          <Icono nombre="menu" tamano={20} />
        </button>
        <div>
          <p className="cabecera__contexto">Poki Koa · Monitoreo neonatal</p>
          <h1 className="cabecera__titulo">{titulo}</h1>
        </div>
      </div>

      <div className="cabecera__derecha">
        <div className="cabecera__reloj" aria-label="Fecha y hora actual">
          <Icono nombre="reloj" tamano={15} />
          <span className="cabecera__fecha">{fecha}</span>
          <span className="cabecera__hora">{hora}</span>
        </div>

        <div className="cabecera__notificaciones">
          <button
            type="button"
            className="cabecera__campana"
            onClick={() => setPanelAbierto((valor) => !valor)}
            aria-label={`Notificaciones (${notificaciones.length})`}
            aria-expanded={panelAbierto}
          >
            <Icono nombre="campana" tamano={18} />
            {notificaciones.length > 0 && (
              <span
                className={`cabecera__contador${
                  criticas > 0 ? ' cabecera__contador--critico' : ''
                }`}
              >
                {notificaciones.length > 9 ? '9+' : notificaciones.length}
              </span>
            )}
          </button>

          {panelAbierto && (
            <>
              <div
                className="cabecera__fondo-panel"
                onClick={() => setPanelAbierto(false)}
                aria-hidden="true"
              />
              <div className="cabecera__panel fade-in">
                <div className="cabecera__panel-cabecera">
                  <p>Alertas activas</p>
                  <span className="badge badge--critico">
                    {criticas} críticas
                  </span>
                </div>

                {notificaciones.length === 0 ? (
                  <p className="cabecera__panel-vacio">
                    Sin alertas activas en este momento.
                  </p>
                ) : (
                  <ul className="cabecera__lista">
                    {notificaciones.slice(0, 6).map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="cabecera__item"
                          onClick={() => {
                            setPanelAbierto(false);
                            navegar('/alertas');
                          }}
                        >
                          <span
                            className={`punto ${
                              item.critica ? 'punto--critico' : 'punto--aviso'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="cabecera__item-texto">
                            <strong>{item.titulo}</strong>
                            <span>{item.detalle}</span>
                            <small>{tiempoRelativo(item.fechaHora)}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  to="/alertas"
                  className="cabecera__panel-pie"
                  onClick={() => setPanelAbierto(false)}
                >
                  Ver todas las alertas
                </Link>
              </div>
            </>
          )}
        </div>

        <Link to="/configuracion" className="cabecera__usuario" title={nombre}>
          <span className="cabecera__avatar" aria-hidden="true">
            {iniciales}
          </span>
          <span className="cabecera__usuario-texto">
            <span className="cabecera__usuario-nombre">{nombre}</span>
            <span className="cabecera__usuario-rol">{rol}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
