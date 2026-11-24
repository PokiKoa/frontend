/**
 * @file ModalEliminarPaciente.tsx
 * @description Eliminación definitiva de un paciente (solo administración),
 * pensada para ingresos creados por error. A diferencia del egreso, borra todo
 * el registro clínico; por eso exige escribir el número de ficha.
 */

import { useState } from 'react';

import { obtenerMensajeError } from '@/api/axios';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import { useToast } from '@/context/ToastContext';
import { useEliminarPacienteMutation } from '@/hooks/queries/pacientes';
import type { Paciente } from '@/types/paciente';

/** Propiedades del componente `ModalEliminarPaciente`. */
interface Props {
  /** Paciente a eliminar definitivamente; si es `null`, el modal permanece cerrado. */
  paciente: Paciente | null;
  /** Callback invocado para cerrar el modal y limpiar el texto de confirmación. */
  onCerrar: () => void;
  /** Callback invocado con la entidad `Paciente` tras completarse el borrado permanente en el backend. */
  onEliminado: (paciente: Paciente) => void;
}

/**
 * Renderiza un diálogo modal de confirmación destructiva para borrar permanentemente
 * un paciente y todos sus registros clínicos asociados (signos vitales, alertas, pesos,
 * planes, observaciones, indicaciones e historial de cunas).
 * Exige que el usuario escriba exactamente el número de ficha (`identificador`) antes de
 * habilitar el botón de borrado.
 *
 * @param props - Propiedades del componente (`{ paciente, onCerrar, onEliminado }`).
 * @returns Elemento `Modal` con advertencia crítica, campo de confirmación y botones de acción.
 */
export default function ModalEliminarPaciente({
  paciente,
  onCerrar,
  onEliminado,
}: Props) {
  const { exito, error: notificarError } = useToast();
  const [confirmacion, setConfirmacion] = useState('');
  const eliminacion = useEliminarPacienteMutation();
  const procesando = eliminacion.isPending;

  const coincide =
    paciente !== null &&
    confirmacion.trim().toUpperCase() === paciente.identificador.toUpperCase();

  const cerrar = () => {
    if (procesando) return;
    setConfirmacion('');
    onCerrar();
  };

  const eliminar = async () => {
    if (!paciente || !coincide) return;
    try {
      await eliminacion.mutateAsync({
        id: paciente.id,
        confirmacion: confirmacion.trim(),
      });
      exito(`${paciente.nombreCompleto} se eliminó definitivamente.`);
      setConfirmacion('');
      onEliminado(paciente);
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    }
  };

  return (
    <Modal
      abierto={Boolean(paciente)}
      titulo="Eliminar paciente definitivamente"
      descripcion="Esta acción no se puede deshacer."
      onCerrar={cerrar}
      ancho="sm"
      pie={
        <>
          <Button variante="secundario" onClick={cerrar} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            variante="peligro"
            onClick={() => void eliminar()}
            cargando={procesando}
            disabled={!coincide}
          >
            Eliminar para siempre
          </Button>
        </>
      }
    >
      <div className="mensaje mensaje--error" role="alert">
        <span aria-hidden="true">!</span>
        <span>
          Se borrarán {paciente?.nombreCompleto} y todo su registro: signos
          vitales, alertas, pesos, planes, observaciones, indicaciones e
          historial de cunas. Para dar de alta a un paciente usa{' '}
          <strong>Registrar egreso</strong>, que conserva la ficha.
        </span>
      </div>
      <Input
        etiqueta={`Escribe ${paciente?.identificador ?? 'la ficha'} para confirmar`}
        value={confirmacion}
        autoComplete="off"
        onChange={(evento) => setConfirmacion(evento.target.value)}
      />
    </Modal>
  );
}
