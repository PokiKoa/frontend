/**
 * @file ObservacionesPaciente.tsx
 * @description Bitácora de observaciones clínicas de un paciente, con registro firmado por el autor.
 */

import { useEffect, useState, type FormEvent } from 'react';

import { obtenerMensajeError } from '@/api/axios';
import { ETIQUETA_CATEGORIA } from '@/api/mappers/planes';
import Button from '@/components/ui/Button/Button';
import { useToast } from '@/context/ToastContext';
import { planesService } from '@/services/planesService';
import type { CategoriaObservacion, Observacion } from '@/types/plan';
import { formatearFechaHora } from '@/utils/fechas';

interface Props {
  pacienteId: number;
  puedeEscribir: boolean;
}

export default function ObservacionesPaciente({
  pacienteId,
  puedeEscribir,
}: Props) {
  const { exito, error: notificarError } = useToast();
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [categoria, setCategoria] =
    useState<CategoriaObservacion>('enfermeria');
  const [contenido, setContenido] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    planesService
      .observaciones(pacienteId)
      .then((lista) => {
        if (vigente) setObservaciones(lista);
      })
      .catch(() => {
        if (vigente) setObservaciones([]);
      });
    return () => {
      vigente = false;
    };
  }, [pacienteId]);

  const registrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (contenido.trim().length < 3) {
      notificarError('Escribe la observación (mínimo 3 caracteres).');
      return;
    }
    setGuardando(true);
    try {
      const nueva = await planesService.observar(
        pacienteId,
        categoria,
        contenido
      );
      setObservaciones((actuales) => [nueva, ...actuales]);
      setContenido('');
      exito('Observación registrada.');
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <div>
          <h2 className="tarjeta__titulo">Observaciones clínicas</h2>
          <p className="tarjeta__subtitulo">{observaciones.length} registros</p>
        </div>
      </header>
      <div className="tarjeta__cuerpo ficha__alertas">
        {puedeEscribir && (
          <form
            className="ficha__observacion"
            onSubmit={(evento) => void registrar(evento)}
          >
            <select
              className="campo__control"
              value={categoria}
              onChange={(evento) =>
                setCategoria(evento.target.value as CategoriaObservacion)
              }
              aria-label="Categoría de la observación"
            >
              {Object.entries(ETIQUETA_CATEGORIA).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
            <textarea
              className="campo__control"
              value={contenido}
              onChange={(evento) => setContenido(evento.target.value)}
              placeholder="Registro de la observación…"
              aria-label="Contenido de la observación"
            />
            <Button type="submit" tamano="sm" cargando={guardando}>
              Registrar observación
            </Button>
          </form>
        )}
        {observaciones.length === 0 ? (
          <p className="texto-muted texto-pequeno">
            Sin observaciones registradas.
          </p>
        ) : (
          observaciones.slice(0, 10).map((observacion) => (
            <article key={observacion.id} className="ficha__alerta">
              <span className="punto" aria-hidden="true" />
              <div>
                <p className="ficha__fuerte">{observacion.contenido}</p>
                <p className="ficha__secundario">
                  {ETIQUETA_CATEGORIA[observacion.categoria]} ·{' '}
                  {observacion.autor} ·{' '}
                  {formatearFechaHora(observacion.creadaEn)}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
