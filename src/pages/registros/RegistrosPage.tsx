/**
 * @file RegistrosPage.tsx
 * @description Bitácora de auditoría (solo administradores): filtros por
 * acción, entidad, usuario y rango de fechas, resumen por verbo y detalle
 * de cada registro con su metadatos.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import { obtenerMensajeError } from '@/api/axios';
import Badge, { type TonoBadge } from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EstadoVacio from '@/components/ui/EstadoVacio/EstadoVacio';
import Icono from '@/components/ui/Iconos/Iconos';
import Modal from '@/components/ui/Modal/Modal';
import Spinner from '@/components/ui/Spinner/Spinner';
import Table, { type TableColumn } from '@/components/ui/Table/Table';
import { useAuth } from '@/context/AuthContext';
import { ETIQUETA_ACCION, ETIQUETA_ENTIDAD } from '@/api/mappers/registros';
import { registrosService } from '@/services/registrosService';
import type {
  AccionAuditoria,
  FiltrosAuditoria,
  RegistroActividad,
  ResumenAuditoria,
} from '@/types/registro';
import { truncar } from '@/utils/calculos';
import { formatearFechaHora, tiempoRelativo } from '@/utils/fechas';
import { puedeVerAuditoria } from '@/utils/roles';

import './RegistrosPage.css';

/** Tamaño de página de la bitácora. */
const POR_PAGINA = 20;

const TONO_ACCION: Partial<Record<AccionAuditoria, TonoBadge>> = {
  crear: 'info',
  asignar: 'info',
  prescribir: 'info',
  liberar: 'aviso',
  intercambiar: 'info',
  eliminar: 'critico',
  reconocer: 'aviso',
  login_fallido: 'critico',
  bloqueo: 'critico',
  login: 'exito',
  alta: 'exito',
  administrar: 'exito',
  resolver: 'exito',
};

/** Acciones auditadas con su etiqueta y tono. */
const ACCIONES = (Object.keys(ETIQUETA_ACCION) as AccionAuditoria[]).map(
  (valor) => ({
    valor,
    etiqueta: ETIQUETA_ACCION[valor],
    tono: TONO_ACCION[valor] ?? ('neutro' as TonoBadge),
  })
);

/** Obtiene la configuración visual de una acción. */
function presentarAccion(accion: AccionAuditoria) {
  return (
    ACCIONES.find((item) => item.valor === accion) ?? {
      valor: accion,
      etiqueta: accion,
      tono: 'neutro' as TonoBadge,
    }
  );
}

/**
 * Bitácora de auditoría del sistema.
 *
 * @returns Filtros, resumen por acción y tabla paginada.
 */
export default function RegistrosPage() {
  const { usuario } = useAuth();

  const [registros, setRegistros] = useState<RegistroActividad[]>([]);
  const [resumen, setResumen] = useState<ResumenAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  const [borrador, setBorrador] = useState<FiltrosAuditoria>({});
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});

  const [detalle, setDetalle] = useState<RegistroActividad | null>(null);

  /**
   * Consulta la bitácora y su resumen con los filtros indicados.
   *
   * @param aplicados - Filtros vigentes.
   */
  const cargar = useCallback(async (aplicados: FiltrosAuditoria) => {
    setCargando(true);
    setError('');

    const [registrosRes, resumenRes] = await Promise.allSettled([
      registrosService.listar(aplicados, POR_PAGINA),
      registrosService.resumen(aplicados),
    ]);

    if (registrosRes.status === 'fulfilled') {
      setRegistros(registrosRes.value.registros);
      setTotal(registrosRes.value.total);
    } else {
      setError(obtenerMensajeError(registrosRes.reason));
    }

    if (resumenRes.status === 'fulfilled') {
      setResumen(resumenRes.value);
    }

    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar({ ...filtros, pagina });
  }, [cargar, filtros, pagina]);

  /**
   * Aplica los filtros del borrador y reinicia la paginación.
   */
  const aplicar = (evento: FormEvent) => {
    evento.preventDefault();
    const limpios: FiltrosAuditoria = {
      accion: borrador.accion,
      entidad: borrador.entidad,
      search: borrador.search?.trim() || undefined,
      desde: borrador.desde || undefined,
      hasta: borrador.hasta || undefined,
    };
    setFiltros(limpios);
    setPagina(1);
  };

  /**
   * Restablece todos los filtros.
   */
  const limpiar = () => {
    setBorrador({});
    setFiltros({});
    setPagina(1);
  };

  /**
   * Filtra por una acción desde las tarjetas de resumen.
   *
   * @param accion - Acción seleccionada.
   */
  const filtrarPorAccion = (accion: AccionAuditoria) => {
    const siguiente: FiltrosAuditoria = {
      ...filtros,
      accion: filtros.accion === accion ? undefined : accion,
    };
    setBorrador((actual) => ({
      ...actual,
      accion: siguiente.accion,
    }));
    setFiltros(siguiente);
    setPagina(1);
  };

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = registros;

  const totalEventos = useMemo(
    () => resumen.reduce((total, item) => total + item.total, 0),
    [resumen]
  );

  const columnas: TableColumn<RegistroActividad>[] = [
    {
      key: 'fecha',
      label: 'Fecha',
      width: '160px',
      render: (fila) => (
        <div>
          <p className="registros__fuerte">
            {formatearFechaHora(fila.creadoEn)}
          </p>
          <p className="registros__secundario">
            {tiempoRelativo(fila.creadoEn)}
          </p>
        </div>
      ),
    },
    {
      key: 'usuario',
      label: 'Responsable',
      render: (fila) => (
        <span className={fila.usuarioId ? '' : 'registros__sistema'}>
          {fila.usuarioNombre}
        </span>
      ),
    },
    {
      key: 'accion',
      label: 'Acción',
      render: (fila) => {
        const configuracion = presentarAccion(fila.accion);
        return (
          <Badge tono={configuracion.tono} punto>
            {fila.accionDisplay || configuracion.etiqueta}
          </Badge>
        );
      },
    },
    {
      key: 'entidad',
      label: 'Entidad',
      render: (fila) => (
        <div>
          <p className="registros__fuerte">{fila.entidad}</p>
          <p className="registros__secundario texto-mono">
            {fila.entidadId ? `#${fila.entidadId}` : '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (fila) => (
        <span title={fila.descripcion}>{truncar(fila.descripcion, 72)}</span>
      ),
    },
    {
      key: 'ip',
      label: 'IP',
      width: '120px',
      render: (fila) => (
        <span className="texto-mono registros__secundario">
          {fila.ipAddress ?? '—'}
        </span>
      ),
    },
    {
      key: 'detalle',
      label: '',
      align: 'right',
      width: '48px',
      render: (fila) => (
        <Button
          variante="fantasma"
          tamano="sm"
          onClick={() => setDetalle(fila)}
          aria-label={`Ver detalle de ${fila.entidad} #${fila.entidadId}`}
        >
          <Icono nombre="ojo" tamano={14} />
        </Button>
      ),
    },
  ];

  if (!puedeVerAuditoria(usuario)) {
    return (
      <div className="pagina">
        <EstadoVacio
          titulo="Acceso restringido"
          texto="La bitácora de auditoría solo está disponible para administradores."
          icono={<Icono nombre="candado" tamano={28} />}
        />
      </div>
    );
  }

  return (
    <div className="pagina registros">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Auditoría del sistema</h2>
          <p className="pagina__descripcion">
            Bitácora inmutable de las acciones clínicas y administrativas.
            Registra quién cambió qué y cuándo.
          </p>
        </div>
        <div className="pagina__acciones">
          <Button
            variante="secundario"
            onClick={() => void cargar({ ...filtros, pagina })}
            cargando={cargando}
          >
            Actualizar
          </Button>
        </div>
      </header>

      <section className="registros__resumen" aria-label="Resumen por acción">
        <button
          type="button"
          className={`registros__resumen-item${
            !filtros.accion ? ' registros__resumen-item--activo' : ''
          }`}
          onClick={() => {
            setBorrador((actual) => ({ ...actual, accion: undefined }));
            setFiltros((actual) => ({ ...actual, accion: undefined }));
            setPagina(1);
          }}
        >
          <Icono nombre="registros" tamano={17} />
          <div>
            <strong>{totalEventos}</strong>
            <span>Todos los eventos</span>
          </div>
        </button>

        {resumen.map((item) => {
          const configuracion = presentarAccion(item.accion);
          return (
            <button
              key={item.accion}
              type="button"
              className={`registros__resumen-item${
                filtros.accion === item.accion
                  ? ' registros__resumen-item--activo'
                  : ''
              }`}
              onClick={() => filtrarPorAccion(item.accion)}
              aria-pressed={filtros.accion === item.accion}
            >
              <span
                className={`punto ${
                  configuracion.tono === 'critico'
                    ? 'punto--critico'
                    : configuracion.tono === 'exito'
                      ? 'punto--exito'
                      : configuracion.tono === 'aviso'
                        ? 'punto--aviso'
                        : ''
                }`}
                aria-hidden="true"
              />
              <div>
                <strong>{item.total}</strong>
                <span>{configuracion.etiqueta}</span>
              </div>
            </button>
          );
        })}
      </section>

      <form className="registros__filtros" onSubmit={aplicar}>
        <div className="registros__buscador">
          <Icono nombre="buscar" tamano={16} />
          <input
            type="search"
            value={borrador.search ?? ''}
            onChange={(evento) =>
              setBorrador((actual) => ({
                ...actual,
                search: evento.target.value,
              }))
            }
            placeholder="Buscar por descripción…"
            aria-label="Buscar en la bitácora"
          />
        </div>

        <select
          className="campo__control"
          value={borrador.accion ?? ''}
          onChange={(evento) =>
            setBorrador((actual) => ({
              ...actual,
              accion: (evento.target.value || undefined) as
                AccionAuditoria | undefined,
            }))
          }
          aria-label="Filtrar por acción"
        >
          <option value="">Todas las acciones</option>
          {ACCIONES.map((accion) => (
            <option key={accion.valor} value={accion.valor}>
              {accion.etiqueta}
            </option>
          ))}
        </select>

        <select
          className="campo__control"
          value={borrador.entidad ?? ''}
          onChange={(evento) =>
            setBorrador((actual) => ({
              ...actual,
              entidad: evento.target.value || undefined,
            }))
          }
          aria-label="Filtrar por entidad"
        >
          <option value="">Todas las entidades</option>
          {Object.entries(ETIQUETA_ENTIDAD).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>

        <label className="registros__rango">
          <span className="registros__rango-etiqueta">Desde</span>
          <input
            type="date"
            className="campo__control"
            value={borrador.desde ?? ''}
            max={borrador.hasta ?? undefined}
            onChange={(evento) =>
              setBorrador((actual) => ({
                ...actual,
                desde: evento.target.value || undefined,
              }))
            }
          />
        </label>

        <label className="registros__rango">
          <span className="registros__rango-etiqueta">Hasta</span>
          <input
            type="date"
            className="campo__control"
            value={borrador.hasta ?? ''}
            min={borrador.desde ?? undefined}
            onChange={(evento) =>
              setBorrador((actual) => ({
                ...actual,
                hasta: evento.target.value || undefined,
              }))
            }
          />
        </label>

        <div className="registros__acciones">
          <Button variante="fantasma" onClick={limpiar}>
            Limpiar
          </Button>
          <Button type="submit" icono={<Icono nombre="filtro" tamano={14} />}>
            Filtrar
          </Button>
        </div>
      </form>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {cargando ? (
        <Spinner bloque texto="Consultando la bitácora…" />
      ) : registros.length === 0 ? (
        <EstadoVacio
          titulo="Sin registros para los filtros"
          texto="Ajusta el rango de fechas o los criterios de búsqueda."
          icono={<Icono nombre="registros" tamano={28} />}
        />
      ) : (
        <>
          <section className="tarjeta tarjeta--sin-relleno">
            <Table
              columns={columnas}
              data={visibles}
              rowKey={(fila) => fila.id}
              etiqueta="Bitácora de auditoría"
            />
          </section>

          <footer className="registros__paginacion">
            <span className="registros__paginacion-texto">
              Mostrando{' '}
              <strong>
                {(paginaActual - 1) * POR_PAGINA + 1}–
                {Math.min(paginaActual * POR_PAGINA, total)}
              </strong>{' '}
              de <strong>{total}</strong> registros
            </span>
            <div className="registros__paginacion-botones">
              <Button
                variante="secundario"
                tamano="sm"
                onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                disabled={paginaActual <= 1}
              >
                Anterior
              </Button>
              <span className="registros__paginacion-pagina">
                Página {paginaActual} de {totalPaginas}
              </span>
              <Button
                variante="secundario"
                tamano="sm"
                onClick={() =>
                  setPagina((actual) => Math.min(totalPaginas, actual + 1))
                }
                disabled={paginaActual >= totalPaginas}
              >
                Siguiente
              </Button>
            </div>
          </footer>
        </>
      )}

      <Modal
        abierto={Boolean(detalle)}
        titulo="Detalle del registro"
        descripcion={
          detalle
            ? `${detalle.entidad} #${detalle.entidadId ?? '—'}`
            : undefined
        }
        ancho="md"
        onCerrar={() => setDetalle(null)}
      >
        {detalle && (
          <dl className="registros__detalle">
            <div>
              <dt>Fecha</dt>
              <dd>{formatearFechaHora(detalle.creadoEn)}</dd>
            </div>
            <div>
              <dt>Responsable</dt>
              <dd>{detalle.usuarioNombre}</dd>
            </div>
            <div>
              <dt>Acción</dt>
              <dd>{detalle.accionDisplay}</dd>
            </div>
            <div>
              <dt>Dirección IP</dt>
              <dd className="texto-mono">{detalle.ipAddress ?? '—'}</dd>
            </div>
            <div className="registros__detalle-completo">
              <dt>Descripción</dt>
              <dd>{detalle.descripcion}</dd>
            </div>
            <div className="registros__detalle-completo">
              <dt>Campos modificados</dt>
              <dd>
                <pre className="registros__metadata">
                  {detalle.camposModificados.length === 0
                    ? 'Sin cambios de campos (la auditoría no guarda valores clínicos).'
                    : detalle.camposModificados.join('\n')}
                </pre>
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
