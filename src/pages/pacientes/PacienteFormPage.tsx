/**
 * @file PacienteFormPage.tsx
 * @description Ingreso (`/pacientes/nuevo`) y edición (`/pacientes/:id/editar`) de pacientes.
 */

import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { obtenerMensajeError } from '@/api/axios';
import PacienteForm from '@/components/pacientes/PacienteForm';
import Icono from '@/components/ui/Iconos/Iconos';
import Spinner from '@/components/ui/Spinner/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCunasQuery } from '@/hooks/queries/cunas';
import {
  useActualizarPacienteMutation,
  useCrearPacienteMutation,
  useMedicosQuery,
  usePacienteQuery,
} from '@/hooks/queries/pacientes';
import type { PacientePayload } from '@/types/paciente';
import { esMedico, puedeAdmitirPaciente } from '@/utils/roles';

export default function PacienteFormPage() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const { exito, error: notificarError } = useToast();

  const modoEdicion = Boolean(id);
  const puedeAdmitir = puedeAdmitirPaciente(usuario);
  const [errorGuardado, setErrorGuardado] = useState('');

  // Al editar no se elige cuna; al crear no hay paciente que cargar
  const consultaPaciente = usePacienteQuery(
    modoEdicion && id ? Number(id) : undefined
  );
  const consultaMedicos = useMedicosQuery();
  const consultaCunas = useCunasQuery(!modoEdicion);
  const crear = useCrearPacienteMutation();
  const actualizar = useActualizarPacienteMutation();

  const paciente = consultaPaciente.data;
  const medicos = consultaMedicos.data ?? [];
  const cunas = (consultaCunas.data ?? []).filter(
    (cuna) => cuna.estado === 'disponible'
  );
  const guardando = crear.isPending || actualizar.isPending;
  const cargando =
    consultaMedicos.isPending ||
    (modoEdicion && consultaPaciente.isPending) ||
    (!modoEdicion && consultaCunas.isPending);
  const errorCarga = [consultaPaciente, consultaMedicos, consultaCunas].find(
    (consulta) => consulta.isError
  )?.error;
  const error =
    errorGuardado || (errorCarga ? obtenerMensajeError(errorCarga) : '');

  if (!modoEdicion && !puedeAdmitir) {
    return <Navigate to="/pacientes" replace />;
  }

  const guardar = async (datos: PacientePayload) => {
    setErrorGuardado('');
    try {
      const resultado =
        modoEdicion && id
          ? await actualizar.mutateAsync({
              id: Number(id),
              payload: datos,
              incluirDatosMedicos: esMedico(usuario),
            })
          : await crear.mutateAsync(datos);
      exito(
        modoEdicion
          ? 'Los datos del paciente se actualizaron.'
          : 'Paciente registrado correctamente.'
      );
      navegar(`/pacientes/${resultado.id}`, { replace: true });
    } catch (fallo) {
      const mensaje = obtenerMensajeError(fallo);
      setErrorGuardado(mensaje);
      notificarError(mensaje);
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
