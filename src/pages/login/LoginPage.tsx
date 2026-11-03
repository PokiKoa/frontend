/**
 * @file LoginPage.tsx
 * @description Inicio de sesión institucional. Valida credenciales, muestra
 * errores del backend y redirige a la ruta solicitada originalmente.
 */

import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { obtenerCodigoError, obtenerMensajeError } from '@/api/axios';
import Icono from '@/components/ui/Iconos/Iconos';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { rutaInicio } from '@/utils/roles';

import './LoginPage.css';

/** Errores de validación del formulario. */
interface Errores {
  username?: string;
  password?: string;
  codigoOtp?: string;
}

/**
 * Pantalla de acceso.
 *
 * @returns Formulario de inicio de sesión con panel institucional.
 */
export default function LoginPage() {
  const { estado, iniciarSesion } = useAuth();
  const { exito } = useToast();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedirOtp, setPedirOtp] = useState(false);
  const [codigoOtp, setCodigoOtp] = useState('');

  const desde = (ubicacion.state as { desde?: string } | null)?.desde;

  if (estado === 'autenticado') {
    return <Navigate to={desde ?? '/'} replace />;
  }

  /**
   * Valida los campos obligatorios antes de llamar a la API.
   *
   * @returns `true` si el formulario es válido.
   */
  const validar = (): boolean => {
    const nuevos: Errores = {};
    if (!username.trim()) nuevos.username = 'El usuario es obligatorio.';
    if (!password) nuevos.password = 'La contraseña es obligatoria.';
    if (pedirOtp && !/^\d{6}$/.test(codigoOtp.trim())) {
      nuevos.codigoOtp = 'Ingresa el código de 6 dígitos de tu aplicación.';
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  /**
   * Envía las credenciales al backend.
   *
   * @param evento - Evento de envío del formulario.
   */
  const alEnviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErrorGeneral('');

    if (!validar()) return;

    setEnviando(true);
    try {
      const usuario = await iniciarSesion({
        username,
        password,
        codigoOtp: pedirOtp ? codigoOtp : undefined,
      });
      exito(`Bienvenido, ${usuario.nombreCompleto}.`);
      navegar(desde ?? rutaInicio(usuario), { replace: true });
    } catch (error) {
      if (obtenerCodigoError(error) === 'two_factor_required') {
        // La contraseña fue correcta: el backend pide el segundo factor
        setPedirOtp(true);
        setErrorGeneral('');
        return;
      }
      setErrorGeneral(obtenerMensajeError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login">
      <section className="login__presentacion" aria-hidden="true">
        <div className="login__marca">
          <img
            className="login__logo"
            src="/poki-koa-logo-256.webp"
            alt=""
            width={56}
            height={56}
          />
          <div>
            <p className="login__marca-nombre">Poki Koa</p>
            <p className="login__marca-sub">Monitoreo neonatal</p>
          </div>
        </div>

        <div className="login__mensaje">
          <p className="login__etiqueta">Unidad de cuidados intensivos</p>
          <h1 className="login__titular">Cada signo vital, bajo control.</h1>
          <p className="login__descripcion">
            Centraliza el monitoreo de cunas, pacientes, prescripciones y
            alertas clínicas en una sola plataforma trazable.
          </p>
        </div>

        <ul className="login__beneficios">
          <li>
            <Icono nombre="cunas" tamano={16} /> Mapa de cunas en tiempo real
          </li>
          <li>
            <Icono nombre="alertas" tamano={16} /> Alertas críticas priorizadas
          </li>
          <li>
            <Icono nombre="escudo" tamano={16} /> Auditoría de cada operación
          </li>
        </ul>

        <p className="login__pie">Sistema interno · Unidad de Neonatología</p>
      </section>

      <main className="login__acceso">
        <form className="login__tarjeta" onSubmit={alEnviar} noValidate>
          <header className="login__cabecera">
            <img
              className="login__logo-movil"
              src="/poki-koa-logo-256.webp"
              alt="Poki Koa"
              width={72}
              height={72}
            />
            <p className="login__saludo">Bienvenido de vuelta</p>
            <h2 className="login__titulo">Inicia sesión</h2>
            <p className="login__indicacion">
              Usa tus credenciales institucionales para acceder al panel
              clínico.
            </p>
          </header>

          {errorGeneral && (
            <div className="mensaje mensaje--error" role="alert">
              <span aria-hidden="true">!</span>
              <span>{errorGeneral}</span>
            </div>
          )}

          <div className="campo">
            <label className="campo__label" htmlFor="usuario">
              Usuario
            </label>
            <div className="campo__envoltura">
              <span className="campo__icono" aria-hidden="true">
                <Icono nombre="usuario" tamano={16} />
              </span>
              <input
                id="usuario"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                className={`campo__control campo__control--con-icono ${
                  errores.username ? 'campo__control--error' : ''
                }`}
                placeholder="nombre.apellido"
                value={username}
                onChange={(evento) => {
                  setUsername(evento.target.value);
                  if (errores.username) {
                    setErrores((previos) => ({
                      ...previos,
                      username: undefined,
                    }));
                  }
                }}
                aria-invalid={Boolean(errores.username)}
              />
            </div>
            {errores.username && (
              <span className="campo__error">{errores.username}</span>
            )}
          </div>

          <div className="campo">
            <label className="campo__label" htmlFor="contrasena">
              Contraseña
            </label>
            <div className="campo__envoltura">
              <span className="campo__icono" aria-hidden="true">
                <Icono nombre="candado" tamano={16} />
              </span>
              <input
                id="contrasena"
                name="password"
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`campo__control campo__control--con-icono login__campo-clave ${
                  errores.password ? 'campo__control--error' : ''
                }`}
                placeholder="••••••••"
                value={password}
                onChange={(evento) => {
                  setPassword(evento.target.value);
                  if (errores.password) {
                    setErrores((previos) => ({
                      ...previos,
                      password: undefined,
                    }));
                  }
                }}
                aria-invalid={Boolean(errores.password)}
              />
              <button
                type="button"
                className="login__ver-clave"
                onClick={() => setVerPassword((valor) => !valor)}
                aria-label={
                  verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
              >
                <Icono nombre="ojo" tamano={16} />
              </button>
            </div>
            {errores.password && (
              <span className="campo__error">{errores.password}</span>
            )}
          </div>

          {pedirOtp && (
            <div className="campo">
              <label className="campo__label" htmlFor="codigo-otp">
                Código de verificación (2FA)
              </label>
              <input
                id="codigo-otp"
                className={`campo__control ${
                  errores.codigoOtp ? 'campo__control--error' : ''
                }`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={codigoOtp}
                onChange={(evento) => setCodigoOtp(evento.target.value)}
                aria-invalid={Boolean(errores.codigoOtp)}
              />
              {errores.codigoOtp && (
                <span className="campo__error">{errores.codigoOtp}</span>
              )}
            </div>
          )}

          <button
            type="submit"
            className="boton boton--primario boton--lg boton--ancho login__enviar"
            disabled={enviando}
          >
            {enviando ? (
              <>
                <span className="boton__spinner" aria-hidden="true" />
                <span>Verificando…</span>
              </>
            ) : (
              <>
                <span>Ingresar al panel</span>
                <Icono nombre="flecha" tamano={16} />
              </>
            )}
          </button>

          <p className="login__nota">
            Si olvidaste tu contraseña, contacta a la jefatura de informática
            para restablecerla.
          </p>
        </form>
      </main>
    </div>
  );
}
