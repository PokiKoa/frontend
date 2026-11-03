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
import { pacientesService } from '@/services/pacientesService';
import type { CausaEgreso, Paciente, ResultadoEgreso } from '@/types/paciente';

interface Props {
  paciente: Paciente | null;
  onCerrar: () => void;
  onEgresado: (paciente: Paciente) => void;
}

export default function ModalEgreso({ paciente, onCerrar, onEgresado }: Props) {
  const { exito, error: notificarError } = useToast();
  const [resultado, setResultado] = useState<ResultadoEgreso>('sobrevivio');
  const [causa, setCausa] = useState<CausaEgreso>('no_aplica');
  const [notas, setNotas] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cerrar = () => {
    if (procesando) return;
    setResultado('sobrevivio');
    setCausa('no_aplica');
    setNotas('');
    onCerrar();
  };

  const confirmar = async () => {
    if (!paciente) return;
    setProcesando(true);
    try {
      const egresado = await pacientesService.egresar(paciente.id, {
        resultado,
        causa,
        notas,
      });
      exito(`Egreso registrado para ${paciente.nombreCompleto}.`);
      onEgresado(egresado);
      setNotas('');
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setProcesando(false);
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
