/**
 * @file ModalEgreso.tsx
 * @description Registro del egreso clínico (exclusivo de neonatología). El
 * backend conserva el historial, libera la cuna, resuelve las alertas y
 * cancela las indicaciones vigentes del paciente.
 */

import { useState } from 'react';

import { obtenerMensajeError } from '@/api/axios';
import { ETIQUETA_CAUSA, ETIQUETA_RESULTADO } from '@/api/mappers/pacientes';
import Button from '@/components/ui/Button/Button';
import Modal from '@/components/ui/Modal/Modal';
import { useToast } from '@/context/ToastContext';
import { useEgresarPacienteMutation } from '@/hooks/queries/pacientes';
import type { CausaEgreso, Paciente, ResultadoEgreso } from '@/types/paciente';

/** Propiedades del componente `ModalEgreso`. */
interface Props {
  /** Paciente activo a egresar; si es `null`, el modal permanece cerrado. */
  paciente: Paciente | null;
  /** Callback invocado para cerrar el modal y restablecer los campos del formulario. */
  onCerrar: () => void;
  /** Callback invocado con la entidad `Paciente` actualizada tras confirmar el egreso en el backend. */
  onEgresado: (paciente: Paciente) => void;
}

/**
 * Renderiza un diálogo modal de confirmación para registrar el egreso clínico de un paciente neonatal.
 * Permite seleccionar el resultado del egreso, la causa clínica y notas opcionales, ejecutando la
 * mutación `useEgresarPacienteMutation` y notificando el resultado mediante toasts.
 *
 * @param props - Propiedades del componente (`{ paciente, onCerrar, onEgresado }`).
 * @returns Elemento `Modal` con selectores de resultado/causa, campo de notas y botones de acción.
 */
export default function ModalEgreso({ paciente, onCerrar, onEgresado }: Props) {
  const { exito, error: notificarError } = useToast();
  const [resultado, setResultado] = useState<ResultadoEgreso>('sobrevivio');
  const [causa, setCausa] = useState<CausaEgreso>('no_aplica');
  const [notas, setNotas] = useState('');
  const egreso = useEgresarPacienteMutation();
  const procesando = egreso.isPending;

  const cerrar = () => {
    if (procesando) return;
    setResultado('sobrevivio');
    setCausa('no_aplica');
    setNotas('');
    onCerrar();
  };

  const confirmar = async () => {
    if (!paciente) return;
    try {
      const egresado = await egreso.mutateAsync({
        id: paciente.id,
        payload: { resultado, causa, notas },
      });
      exito(`Egreso registrado para ${paciente.nombreCompleto}.`);
      onEgresado(egresado);
      setNotas('');
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    }
  };

  return (
    <Modal
      abierto={Boolean(paciente)}
      titulo={`Registrar egreso de ${paciente?.nombreCompleto ?? ''}`}
      descripcion="Se libera la cuna, se resuelven sus alertas y se cancelan las indicaciones vigentes. El historial se conserva."
      onCerrar={cerrar}
      ancho="sm"
      pie={
        <>
          <Button variante="secundario" onClick={cerrar} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            variante="peligro"
            onClick={() => void confirmar()}
            cargando={procesando}
          >
            Confirmar egreso
          </Button>
        </>
      }
    >
      <div className="campo">
        <label className="campo__label" htmlFor="egreso-resultado">
          Resultado *
        </label>
        <select
          id="egreso-resultado"
          className="campo__control"
          value={resultado}
          onChange={(evento) =>
            setResultado(evento.target.value as ResultadoEgreso)
          }
        >
          {Object.entries(ETIQUETA_RESULTADO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label className="campo__label" htmlFor="egreso-causa">
          Causa clínica
        </label>
        <select
          id="egreso-causa"
          className="campo__control"
          value={causa}
          onChange={(evento) => setCausa(evento.target.value as CausaEgreso)}
        >
          {Object.entries(ETIQUETA_CAUSA).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label className="campo__label" htmlFor="egreso-notas">
          Notas
        </label>
        <textarea
          id="egreso-notas"
          className="campo__control"
          value={notas}
          onChange={(evento) => setNotas(evento.target.value)}
          placeholder="Indicaciones de alta, destino del traslado…"
        />
      </div>
    </Modal>
  );
}