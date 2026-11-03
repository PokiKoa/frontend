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
import { pacientesService } from '@/services/pacientesService';
import type { Paciente } from '@/types/paciente';

interface Props {
  paciente: Paciente | null;
  onCerrar: () => void;
  onEliminado: (paciente: Paciente) => void;
}

export default function ModalEliminarPaciente({
  paciente,
  onCerrar,
  onEliminado,
}: Props) {
  const { exito, error: notificarError } = useToast();
  const [confirmacion, setConfirmacion] = useState('');
  const [procesando, setProcesando] = useState(false);

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
    setProcesando(true);
    try {
      await pacientesService.eliminarDefinitivo(
        paciente.id,
        confirmacion.trim()
      );
      exito(`${paciente.nombreCompleto} se eliminó definitivamente.`);
      setConfirmacion('');
      onEliminado(paciente);
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setProcesando(false);
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
