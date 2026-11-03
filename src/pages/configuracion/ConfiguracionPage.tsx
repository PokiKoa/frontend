/**
 * @file ConfiguracionPage.tsx
 * @description Cuenta del usuario: identidad, cambio de contraseña, doble
 * factor (TOTP), cierre de sesión, alcance del rol y datos del entorno.
 */

import { useState, type FormEvent } from 'react';

import { API_URL, obtenerMensajeError } from '@/api/axios';
import { ETIQUETA_TURNO } from '@/api/mappers/auth';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Icono from '@/components/ui/Iconos/Iconos';
import Modal from '@/components/ui/Modal/Modal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  activarDobleFactor,
  cambiarContrasena,
  desactivarDobleFactor,
  prepararDobleFactor,
  type ConfiguracionDobleFactor,
} from '@/services/authService';
import { formatearFecha, formatearFechaHora } from '@/utils/fechas';
import {
  ACCESO_PANTALLAS,
  esMedico,
  etiquetaRol,
  puedeAdministrarDosis,
  puedeGestionarCatalogo,
  puedeGestionarClinica,
  puedeVerAuditoria,
  type Pantalla,
} from '@/utils/roles';

import './ConfiguracionPage.css';

const NOMBRE_PANTALLA: Record<Pantalla, string> = {
  panel: 'Panel general',
  mapa: 'Mapa de cunas',
  misCunas: 'Mis cunas',
  pacientes: 'Pacientes',
  medicamentos: 'Medicamentos',
  planes: 'Planes de cuidado',
  alertas: 'Alertas',
  turnos: 'Turnos',
  reportes: 'Reportes',
  registros: 'Auditoría',
  configuracion: 'Configuración',
};

function CambioContrasena() {
  const { exito, error: notificarError } = useToast();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (nueva !== confirmacion) {
      notificarError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setGuardando(true);
    try {
      await cambiarContrasena(actual, nueva);
      setActual('');
      setNueva('');
      setConfirmacion('');
      exito('Contraseña actualizada. Se cerraron tus otras sesiones.');
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      className="configuracion__formulario"
      onSubmit={(evento) => void enviar(evento)}
    >
      <div className="campo">
        <label className="campo__label" htmlFor="clave-actual">
          Contraseña actual
        </label>
        <input
          id="clave-actual"
          type="password"
          className="campo__control"
          autoComplete="current-password"
          value={actual}
          onChange={(evento) => setActual(evento.target.value)}
          required
        />
      </div>
      <div className="campo">
        <label className="campo__label" htmlFor="clave-nueva">
          Nueva contraseña
        </label>
        <input
          id="clave-nueva"
          type="password"
          className="campo__control"
          autoComplete="new-password"
          minLength={10}
          value={nueva}
          onChange={(evento) => setNueva(evento.target.value)}
          required
        />
        <span className="campo__ayuda">
          Mínimo 10 caracteres, con mayúsculas, minúsculas y dígitos.
        </span>
      </div>
      <div className="campo">
        <label className="campo__label" htmlFor="clave-confirmacion">
          Confirmar nueva contraseña
        </label>
        <input
          id="clave-confirmacion"
          type="password"
          className="campo__control"
          autoComplete="new-password"
          value={confirmacion}
          onChange={(evento) => setConfirmacion(evento.target.value)}
          required
        />
      </div>
      <Button type="submit" cargando={guardando}>
        Cambiar contraseña
      </Button>
    </form>
  );
}

function DobleFactor() {
  const { usuario, recargarUsuario } = useAuth();
  const { exito, error: notificarError } = useToast();
  const [configuracion, setConfiguracion] =
    useState<ConfiguracionDobleFactor | null>(null);
  const [codigo, setCodigo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const activo = Boolean(usuario?.dobleFactorActivo);

  const ejecutar = async (accion: () => Promise<void>, mensaje: string) => {
    setProcesando(true);
    try {
      await accion();
      await recargarUsuario();
      setCodigo('');
      setConfiguracion(null);
      exito(mensaje);
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setProcesando(false);
    }
  };

  const preparar = async () => {
    setProcesando(true);
    try {
      setConfiguracion(await prepararDobleFactor());
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setProcesando(false);
    }
  };

  const campoCodigo = (
    <input
      className="campo__control"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="Código de 6 dígitos"
      value={codigo}
      onChange={(evento) => setCodigo(evento.target.value)}
      aria-label="Código de verificación"
    />
  );

  return (
    <div className="configuracion__formulario">
      <p>
        <Badge tono={activo ? 'exito' : 'neutro'} punto>
          {activo ? 'Doble factor activo' : 'Doble factor inactivo'}
        </Badge>
      </p>

      {activo ? (
        <>
          <p className="configuracion__nota">
            Para desactivarlo, confirma con un código actual de tu aplicación
            autenticadora.
          </p>
          {campoCodigo}
          <Button
            variante="peligro"
            cargando={procesando}
            onClick={() =>
              void ejecutar(
                () => desactivarDobleFactor(codigo),
                'Doble factor desactivado.'
              )
            }
          >
            Desactivar
          </Button>
        </>
      ) : configuracion ? (
        <>
          <p className="configuracion__nota">
            Agrega la cuenta en tu aplicación autenticadora (Google
            Authenticator, Microsoft Authenticator, FreeOTP…) con esta clave y
            confirma con el código que genere.
          </p>
          <code className="configuracion__token-valor">
            {configuracion.secreto}
          </code>
          <a
            className="boton boton--fantasma boton--sm"
            href={configuracion.uriAprovisionamiento}
          >
            Abrir en la aplicación autenticadora
          </a>
          {campoCodigo}
          <Button
            cargando={procesando}
            onClick={() =>
              void ejecutar(
                () => activarDobleFactor(codigo),
                'Doble factor activado.'
              )
            }
          >
            Confirmar y activar
          </Button>
        </>
      ) : (
        <>
          <p className="configuracion__nota">
            Recomendado para cuentas administrativas. Al iniciar sesión se
            pedirá además un código de 6 dígitos.
          </p>
          <Button
            variante="secundario"
            cargando={procesando}
            onClick={() => void preparar()}
          >
            Configurar doble factor
          </Button>
        </>
      )}
    </div>
  );
}

export default function ConfiguracionPage() {
  const { usuario, cerrarSesion } = useAuth();
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const nombre = usuario?.nombreCompleto || usuario?.username || 'Usuario';
  const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone || '—';
  const pantallas = (Object.keys(ACCESO_PANTALLAS) as Pantalla[]).filter(
    (pantalla) =>
      usuario ? ACCESO_PANTALLAS[pantalla].includes(usuario.rol) : false
  );
  const permisos: Array<[boolean, string]> = [
    [
      puedeGestionarClinica(usuario),
      'Admitir pacientes, registrar pesos, planes y observaciones.',
    ],
    [
      esMedico(usuario),
      'Diagnóstico, médico tratante, egresos e indicaciones médicas.',
    ],
    [puedeAdministrarDosis(usuario), 'Administrar dosis de medicamentos.'],
    [
      puedeGestionarCatalogo(usuario),
      'Gestionar el catálogo y el stock de farmacia.',
    ],
    [
      puedeVerAuditoria(usuario),
      'Gestionar cunas, turnos y revisar la auditoría.',
    ],
  ];

  const salir = async () => {
    setSaliendo(true);
    try {
      await cerrarSesion();
    } finally {
      setSaliendo(false);
    }
  };

  return (
    <div className="pagina configuracion">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Configuración</h2>
          <p className="pagina__descripcion">
            Identidad clínica, seguridad de la cuenta y alcance de tu rol en
            Poki Koa.
          </p>
        </div>
      </header>

      <div className="configuracion__rejilla">
        <section className="tarjeta configuracion__perfil">
          <div className="configuracion__identidad">
            <span className="configuracion__avatar" aria-hidden="true">
              {usuario?.iniciales ?? 'PK'}
            </span>
            <div>
              <h3 className="configuracion__nombre">{nombre}</h3>
              <p className="configuracion__rol">
                <Badge tono="info" punto>
                  {etiquetaRol(usuario?.rol)}
                </Badge>
                {usuario?.turno && (
                  <span className="chip">
                    <Icono nombre="reloj" tamano={12} />
                    Turno {ETIQUETA_TURNO[usuario.turno].toLowerCase()}
                  </span>
                )}
              </p>
            </div>
          </div>

          <dl className="configuracion__datos">
            <div>
              <dt>Usuario</dt>
              <dd className="texto-mono">{usuario?.username ?? '—'}</dd>
            </div>
            <div>
              <dt>Correo institucional</dt>
              <dd>{usuario?.email || 'No registrado'}</dd>
            </div>
            <div>
              <dt>Estado de la cuenta</dt>
              <dd>
                <Badge tono={usuario?.activo ? 'exito' : 'critico'} punto>
                  {usuario?.activo ? 'Activa' : 'Inactiva'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Alta en el sistema</dt>
              <dd>{formatearFecha(usuario?.creadoEn)}</dd>
            </div>
            <div>
              <dt>Último acceso</dt>
              <dd>{formatearFechaHora(usuario?.ultimoAcceso)}</dd>
            </div>
          </dl>
        </section>

        <section className="tarjeta configuracion__sesion">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Sesión</h2>
              <p className="tarjeta__subtitulo">
                Sesión segura con renovación automática.
              </p>
            </div>
            <Icono nombre="escudo" tamano={20} />
          </header>
          <div className="tarjeta__cuerpo configuracion__sesion-cuerpo">
            <p className="configuracion__nota">
              <Icono nombre="candado" tamano={14} />
              El acceso se renueva solo mientras trabajas y la credencial de
              renovación se guarda en una cookie protegida que ningún script
              puede leer. Cierra sesión al terminar tu turno si compartes el
              equipo.
            </p>
            <div className="configuracion__acciones">
              <Button
                variante="peligro"
                onClick={() => setConfirmandoSalida(true)}
                icono={<Icono nombre="salir" tamano={15} />}
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="configuracion__rejilla">
        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Cambiar contraseña</h2>
              <p className="tarjeta__subtitulo">
                Cierra las sesiones abiertas en otros equipos.
              </p>
            </div>
            <Icono nombre="candado" tamano={19} />
          </header>
          <div className="tarjeta__cuerpo">
            <CambioContrasena />
          </div>
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Doble factor (2FA)</h2>
              <p className="tarjeta__subtitulo">
                Código temporal además de la contraseña.
              </p>
            </div>
            <Icono nombre="escudo" tamano={19} />
          </header>
          <div className="tarjeta__cuerpo">
            <DobleFactor />
          </div>
        </section>
      </div>

      <div className="configuracion__rejilla">
        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Alcance de tu rol</h2>
              <p className="tarjeta__subtitulo">
                Pantallas: {pantallas.map((p) => NOMBRE_PANTALLA[p]).join(', ')}
                .
              </p>
            </div>
            <Icono nombre="usuario" tamano={19} />
          </header>
          <div className="tarjeta__cuerpo">
            <ul className="configuracion__permisos">
              {permisos.map(([permitido, texto]) => (
                <li
                  key={texto}
                  className={permitido ? '' : 'configuracion__permiso--no'}
                >
                  <Icono nombre={permitido ? 'check' : 'cerrar'} tamano={15} />
                  {texto}
                </li>
              ))}
            </ul>
            <p className="configuracion__nota">
              <Icono nombre="escudo" tamano={14} />
              El servidor es la autoridad final: si una acción no está permitida
              para tu rol, la API la rechaza aunque la interfaz la muestre.
            </p>
          </div>
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <div>
              <h2 className="tarjeta__titulo">Entorno</h2>
              <p className="tarjeta__subtitulo">
                Datos técnicos de la instalación.
              </p>
            </div>
            <Icono nombre="configuracion" tamano={19} />
          </header>
          <div className="tarjeta__cuerpo">
            <dl className="configuracion__datos configuracion__datos--entorno">
              <div>
                <dt>API</dt>
                <dd className="texto-mono">{API_URL}</dd>
              </div>
              <div>
                <dt>Zona horaria del navegador</dt>
                <dd className="texto-mono">{zonaHoraria}</dd>
              </div>
              <div>
                <dt>Zona horaria institucional</dt>
                <dd className="texto-mono">America/Santiago</dd>
              </div>
              <div>
                <dt>Versión</dt>
                <dd>Poki Koa UI · 2.0.0</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <Modal
        abierto={confirmandoSalida}
        titulo="Cerrar sesión"
        descripcion="Se revocará tu sesión en el servidor y volverás a la pantalla de acceso."
        ancho="sm"
        onCerrar={() => {
          if (!saliendo) setConfirmandoSalida(false);
        }}
        pie={
          <>
            <Button
              variante="secundario"
              onClick={() => setConfirmandoSalida(false)}
              disabled={saliendo}
            >
              Cancelar
            </Button>
            <Button
              variante="peligro"
              onClick={() => void salir()}
              cargando={saliendo}
            >
              Cerrar sesión
            </Button>
          </>
        }
      >
        <p className="configuracion__confirmacion">
          ¿Deseas salir de Poki Koa, <strong>{nombre}</strong>? Asegúrate de
          haber registrado tus pendientes del turno antes de continuar.
        </p>
      </Modal>
    </div>
  );
}
