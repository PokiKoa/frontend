/**
 * @file AlertasPage.tsx
 * @description Centro de alertas clínicas: filtros por estado y severidad,
 * resolución de eventos y contexto del paciente/cuna.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { obtenerMensajeError } from '@/api/axios';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EstadoVacio from '@/components/ui/EstadoVacio/EstadoVacio';
import Icono from '@/components/ui/Iconos/Iconos';
import Modal from '@/components/ui/Modal/Modal';
import Spinner from '@/components/ui/Spinner/Spinner';
import Table, { type TableColumn } from '@/components/ui/Table/Table';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTiempoReal } from '@/hooks/useTiempoReal';
import {
  alertasService,
  aplicarEventoAlertas,
} from '@/services/alertasService';
import type { Alerta, NivelAlerta } from '@/types/alerta';
import { formatearFechaHora, tiempoRelativo } from '@/utils/fechas';
import { puedeAtenderAlertas } from '@/utils/roles';

import './AlertasPage.css';

/** Filtro de estado. */
type FiltroEstado = 'activas' | 'todas';
/** Filtro de severidad. */
type FiltroNivel = 'todos' | NivelAlerta;

/**
 * Centro de alertas.
 *
 * @returns Resumen, filtros y tabla de alertas.
 */
const ESTADO_ALERTA: Record<
  Alerta['estado'],
  { texto: string; tono: 'critico' | 'aviso' | 'neutro' }
> = {
  activa: { texto: 'Activa', tono: 'critico' },
  reconocida: { texto: 'Reconocida', tono: 'aviso' },
  resuelta: { texto: 'Resuelta', tono: 'neutro' },
};

export default function AlertasPage() {
  const { usuario } = useAuth();
  const { exito, error: notificarError } = useToast();
  const atiende = puedeAtenderAlertas(usuario);

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [resueltas, setResueltas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('activas');
  const [nivel, setNivel] = useState<FiltroNivel>('todos');
  const [resolviendo, setResolviendo] = useState<number | null>(null);
  const [alertaAResolver, setAlertaAResolver] = useState<Alerta | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [lista, cerradas] = await Promise.all([
        alertasService.listar({
          abiertas: estado === 'activas' ? true : undefined,
          nivel: nivel === 'todos' ? undefined : nivel,
        }),
        alertasService.listar({ abiertas: false }),
      ]);
      setAlertas(lista.alertas);
      setResueltas(cerradas.total);
    } catch (fallo) {
      setError(obtenerMensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [estado, nivel]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // La vista de abiertas se mantiene en vivo; el historial completo se recarga ante cambios de alertas
  useTiempoReal('/ws/v1/monitoring/stream/', (evento) => {
    if (estado === 'activas') {
      setAlertas((actuales) => {
        const siguientes = aplicarEventoAlertas(actuales, evento);
        return nivel === 'todos'
          ? siguientes
          : siguientes.filter((a) => a.nivel === nivel);
      });
      if (evento.event === 'alert.resolved') setResueltas((total) => total + 1);
    } else if (evento.event.startsWith('alert.')) {
      void cargar();
    }
  });

  const filtradas = alertas;
  const activas = useMemo(
    () => alertas.filter((alerta) => alerta.activa),
    [alertas]
  );
  const criticas = activas.filter((alerta) => alerta.nivel === 'Critica');

  const accionar = async (alerta: Alerta, accion: 'reconocer' | 'resolver') => {
    setResolviendo(alerta.id);
    try {
      await alertasService[accion](alerta.id);
      exito(
        accion === 'reconocer'
          ? 'Alerta reconocida.'
          : 'Alerta marcada como resuelta.'
      );
      setAlertaAResolver(null);
      await cargar();
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setResolviendo(null);
    }
  };

  const columnas: TableColumn<Alerta>[] = [
    {
      key: 'mensaje',
      label: 'Evento',
      render: (fila) => (
        <div className="alertas__evento">
          <span
            className={`punto ${
              fila.nivel === 'Critica'
                ? 'punto--critico'
                : fila.nivel === 'Advertencia'
                  ? 'punto--aviso'
                  : 'punto--exito'
            }`}
            aria-hidden="true"
          />
          <div>
            <p className="alertas__mensaje">{fila.mensaje}</p>
            <p className="alertas__meta">{fila.tipoDisplay}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'ubicacion',
      label: 'Paciente / Cuna',
      render: (fila) => (
        <div>
          <p className="alertas__mensaje">
            {fila.pacienteNombre ?? 'Sin paciente'}
          </p>
          <p className="alertas__meta">
            {fila.cunaIdentificador
              ? `Cuna ${fila.cunaIdentificador}`
              : 'Sin cuna'}
          </p>
        </div>
      ),
    },
    {
      key: 'nivel',
      label: 'Severidad',
      render: (fila) => (
        <Badge
          tono={
            fila.nivel === 'Critica'
              ? 'critico'
              : fila.nivel === 'Advertencia'
                ? 'aviso'
                : 'info'
          }
          punto
        >
          {fila.nivelDisplay}
        </Badge>
      ),
    },
    {
      key: 'fecha',
      label: 'Registro',
      render: (fila) => (
        <div>
          <p className="alertas__mensaje">{tiempoRelativo(fila.fechaHora)}</p>
          <p className="alertas__meta">{formatearFechaHora(fila.fechaHora)}</p>
        </div>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (fila) => (
        <div>
          <Badge tono={ESTADO_ALERTA[fila.estado].tono} punto>
            {ESTADO_ALERTA[fila.estado].texto}
          </Badge>
          {fila.reconocidaPor && fila.estado === 'reconocida' && (
            <p className="alertas__meta">por {fila.reconocidaPor}</p>
          )}
        </div>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      align: 'right',
      render: (fila) =>
        atiende && fila.activa ? (
          <div className="alertas__acciones">
            {fila.estado === 'activa' && (
              <Button
                variante="secundario"
                tamano="sm"
                cargando={resolviendo === fila.id}
                onClick={() => void accionar(fila, 'reconocer')}
              >
                Reconocer
              </Button>
            )}
            <Button
              variante="exito"
              tamano="sm"
              disabled={resolviendo === fila.id}
              onClick={() => setAlertaAResolver(fila)}
            >
              Resolver
            </Button>
          </div>
        ) : (
          <span className="alertas__meta">—</span>
        ),
    },
  ];

  return (
    <div className="pagina alertas">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Alertas clínicas</h2>
          <p className="pagina__descripcion">
            Eventos generados por el motor de signos vitales y su seguimiento.
          </p>
        </div>
        <div className="pagina__acciones">
          <Button
            variante="secundario"
            onClick={() => void cargar()}
            cargando={cargando}
          >
            Actualizar
          </Button>
        </div>
      </header>

      <section className="alertas__resumen">
        <div className="alertas__resumen-item alertas__resumen-item--critico">
          <Icono nombre="alertas" tamano={18} />
          <div>
            <strong>{criticas.length}</strong>
            <span>Críticas activas</span>
          </div>
        </div>
        <div className="alertas__resumen-item">
          <Icono nombre="campana" tamano={18} />
          <div>
            <strong>{activas.length}</strong>
            <span>Abiertas (activas y reconocidas)</span>
          </div>
        </div>
        <div className="alertas__resumen-item alertas__resumen-item--exito">
          <Icono nombre="check" tamano={18} />
          <div>
            <strong>{resueltas}</strong>
            <span>Resueltas</span>
          </div>
        </div>
      </section>

      <div className="alertas__filtros">
        <div className="alertas__grupo">
          <button
            type="button"
            className={`chip ${estado === 'activas' ? 'chip--activo' : ''}`}
            onClick={() => setEstado('activas')}
          >
            Abiertas
          </button>
          <button
            type="button"
            className={`chip ${estado === 'todas' ? 'chip--activo' : ''}`}
            onClick={() => setEstado('todas')}
          >
            Todas
          </button>
        </div>

        <select
          className="campo__control alertas__select"
          value={nivel}
          onChange={(evento) => setNivel(evento.target.value as FiltroNivel)}
          aria-label="Filtrar por severidad"
        >
          <option value="todos">Todas las severidades</option>
          <option value="Critica">Crítica</option>
          <option value="Advertencia">Advertencia</option>
          <option value="Info">Informativa</option>
        </select>
      </div>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {cargando ? (
        <Spinner bloque texto="Cargando alertas…" />
      ) : filtradas.length === 0 ? (
        <EstadoVacio
          titulo="Sin alertas para los filtros"
          texto="La unidad no registra eventos con estos criterios."
          icono={<Icono nombre="check" tamano={28} />}
        />
      ) : (
        <section className="tarjeta tarjeta--sin-relleno">
          <Table
            columns={columnas}
            data={filtradas}
            rowKey={(fila) => fila.id}
            etiqueta="Alertas clínicas"
          />
        </section>
      )}

      <Modal
        abierto={Boolean(alertaAResolver)}
        titulo="Marcar alerta como resuelta"
        descripcion="La alerta dejará de contarse como activa. El evento se conserva en el historial y la acción queda auditada."
        ancho="sm"
        onCerrar={() => {
          if (resolviendo === null) setAlertaAResolver(null);
        }}
        pie={
          <>
            <Button
              variante="secundario"
              onClick={() => setAlertaAResolver(null)}
              disabled={resolviendo !== null}
            >
              Cancelar
            </Button>
            <Button
              variante="exito"
              onClick={() => {
                if (alertaAResolver) void accionar(alertaAResolver, 'resolver');
              }}
              cargando={resolviendo !== null}
            >
              Marcar como resuelta
            </Button>
          </>
        }
      >
        <p className="alertas__confirmacion">
          Se resolverá la alerta <strong>{alertaAResolver?.mensaje}</strong> de
          la cuna{' '}
          <strong>{alertaAResolver?.cunaIdentificador ?? 'sin asignar'}</strong>
          {alertaAResolver?.pacienteNombre
            ? ` (${alertaAResolver.pacienteNombre})`
            : ''}
          .
        </p>
      </Modal>
    </div>
  );
}
