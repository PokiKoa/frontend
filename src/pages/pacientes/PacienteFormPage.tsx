/**
 * @file PacienteFormPage.tsx
 * @description Ingreso (`/pacientes/nuevo`) y edición (`/pacientes/:id/editar`) de pacientes.
 */

import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { obtenerMensajeError } from '@/api/axios';
import PacienteForm from '@/components/pacientes/PacienteForm';
import Icono from '@/components/ui/Iconos/Iconos';
import Spinner from '@/components/ui/Spinner/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cunasService } from '@/services/cunasService';
import { pacientesService } from '@/services/pacientesService';
import type { Cuna } from '@/types/cuna';
import type { Medico, Paciente, PacientePayload } from '@/types/paciente';
import { esMedico, puedeAdmitirPaciente } from '@/utils/roles';

export default function PacienteFormPage() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const { exito, error: notificarError } = useToast();

  const modoEdicion = Boolean(id);
  const puedeAdmitir = puedeAdmitirPaciente(usuario);
  const [paciente, setPaciente] = useState<Paciente | undefined>(undefined);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [cunas, setCunas] = useState<Cuna[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    Promise.all([
      pacientesService.medicos(),
      modoEdicion ? Promise.resolve([]) : cunasService.listar(),
      modoEdicion && id
        ? pacientesService.obtener(Number(id))
        : Promise.resolve(undefined),
    ])
      .then(([listaMedicos, listaCunas, datosPaciente]) => {
        if (!vigente) return;
        setMedicos(listaMedicos);
        setCunas(listaCunas.filter((cuna) => cuna.estado === 'disponible'));
        setPaciente(datosPaciente);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(obtenerMensajeError(fallo));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [id, modoEdicion]);

  if (!modoEdicion && !puedeAdmitir) {
    return <Navigate to="/pacientes" replace />;
  }

  const guardar = async (datos: PacientePayload) => {
    setGuardando(true);
    setError('');
    try {
      const resultado =
        modoEdicion && id
          ? await pacientesService.actualizar(Number(id), datos, {
              incluirDatosMedicos: esMedico(usuario),
            })
          : await pacientesService.crear(datos);
      exito(
        modoEdicion
          ? 'Los datos del paciente se actualizaron.'
          : 'Paciente registrado correctamente.'
      );
      navegar(`/pacientes/${resultado.id}`, { replace: true });
    } catch (fallo) {
      const mensaje = obtenerMensajeError(fallo);
      setError(mensaje);
      notificarError(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <Spinner bloque texto="Cargando datos del paciente…" />;
  }

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <Link to="/pacientes" className="pagina__volver">
            <Icono nombre="volver" tamano={14} />
            Volver al listado
          </Link>
          <h2 className="pagina__titulo">
            {modoEdicion ? 'Editar paciente' : 'Nuevo ingreso'}
          </h2>
          <p className="pagina__descripcion">
            {modoEdicion
              ? 'Actualiza los datos clínicos y administrativos del recién nacido.'
              : 'Registra el ingreso de un recién nacido a la unidad neonatal.'}
          </p>
        </div>
      </header>

      {modoEdicion && !paciente && error ? (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      ) : (
        <PacienteForm
          paciente={paciente}
          medicos={medicos}
          cunas={cunas}
          puedeEditarDatosMedicos={esMedico(usuario)}
          guardando={guardando}
          error={error}
          onSubmit={guardar}
          onCancelar={() =>
            navegar(modoEdicion && id ? `/pacientes/${id}` : '/pacientes')
          }
        />
      )}
    </div>
  );
}
