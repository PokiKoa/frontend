/**
 * @file MedicamentosPage.tsx
 * @description Farmacia: catálogo con stock e indicaciones médicas con su
 * esquema de dosis. Cada acción se muestra solo al rol que puede hacerla:
 * farmacia y admin gestionan el catálogo, neonatología prescribe y cancela,
 * neonatología y enfermería administran dosis.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { obtenerMensajeError } from '@/api/axios';
import { describirEsquema, ETIQUETA_VIA } from '@/api/mappers/medicamentos';
import {
  CatalogoForm,
  PrescripcionForm,
} from '@/components/medicamentos/MedicamentoFormularios';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EstadoVacio from '@/components/ui/EstadoVacio/EstadoVacio';
import Icono from '@/components/ui/Iconos/Iconos';
import Modal from '@/components/ui/Modal/Modal';
import Spinner from '@/components/ui/Spinner/Spinner';
import Table, { type TableColumn } from '@/components/ui/Table/Table';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { medicamentosService } from '@/services/medicamentosService';
import { pacientesService } from '@/services/pacientesService';
import type {
  Administracion,
  CatalogoPayload,
  EstadoPrescripcion,
  Medicamento,
  MedicamentoCatalogo,
  MedicamentoPayload,
} from '@/types/medicamento';
import type { Paciente } from '@/types/paciente';
import { formatearFechaHora } from '@/utils/fechas';
import {
  esMedico,
  puedeAdministrarDosis,
  puedeGestionarCatalogo,
} from '@/utils/roles';
import { esIndicacionVigente } from '@/utils/estados';

import './MedicamentosPage.css';

type Pestana = 'inventario' | 'prescripciones';
type ModalAbierto =
  'catalogo' | 'prescripcion' | 'administrar' | 'historial' | 'cancelar' | null;

const TONO_ESTADO: Record<EstadoPrescripcion, 'exito' | 'aviso' | 'neutro'> = {
  Vigente: 'aviso',
  Completada: 'exito',
  Cancelada: 'neutro',
};

export default function MedicamentosPage() {
  const { usuario } = useAuth();
  const { exito, error: notificarError } = useToast();
  const gestionaCatalogo = puedeGestionarCatalogo(usuario);
  const prescribe = esMedico(usuario);
  const administra = puedeAdministrarDosis(usuario);

  const [pestana, setPestana] = useState<Pestana>(
    gestionaCatalogo ? 'inventario' : 'prescripciones'
  );
  const [catalogo, setCatalogo] = useState<MedicamentoCatalogo[]>([]);
  const [prescripciones, setPrescripciones] = useState<Medicamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [soloVigentes, setSoloVigentes] = useState(true);

  const [modal, setModal] = useState<ModalAbierto>(null);
  const [productoEdicion, setProductoEdicion] =
    useState<MedicamentoCatalogo | null>(null);
  const [seleccionada, setSeleccionada] = useState<Medicamento | null>(null);
  const [historial, setHistorial] = useState<Administracion[]>([]);
  const [notas, setNotas] = useState('');
  const [usarAtrasada, setUsarAtrasada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [
        listaCatalogo,
        listaPrescripciones,
        { pacientes: listaPacientes },
      ] = await Promise.all([
        medicamentosService.listarCatalogo({ stockBajo: soloStockBajo }),
        medicamentosService.listarPrescripciones({
          estado: soloVigentes ? 'Vigente' : undefined,
        }),
        pacientesService.listar({ estado: 'activo' }, 100),
      ]);
      const cunaDe = new Map(
        listaPacientes.map((p) => [p.id, p.cunaIdentificador])
      );
      setCatalogo(listaCatalogo);
      setPrescripciones(
        listaPrescripciones.map((p) => ({
          ...p,
          cuna: cunaDe.get(p.pacienteId) ?? 'Sin cuna',
        }))
      );
      setPacientes(listaPacientes);
    } catch (fallo) {
      setError(obtenerMensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [soloStockBajo, soloVigentes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const catalogoFiltrado = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return catalogo.filter(
      (item) =>
        !texto ||
        item.nombre.toLowerCase().includes(texto) ||
        item.principioActivo.toLowerCase().includes(texto)
    );
  }, [catalogo, busqueda]);

  const prescripcionesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return prescripciones.filter(
      (item) =>
        !texto ||
        item.pacienteNombre.toLowerCase().includes(texto) ||
        item.nombre.toLowerCase().includes(texto)
    );
  }, [prescripciones, busqueda]);

  const vigentes = prescripciones.filter(esIndicacionVigente);
  const atrasadas = vigentes.filter((item) => item.atrasada).length;
  const stockCritico = catalogo.filter((item) => item.stockBajo).length;

  const cerrarModal = () => {
    if (guardando) return;
    setModal(null);
    setSeleccionada(null);
    setNotas('');
    setUsarAtrasada(false);
    setErrorFormulario('');
  };

  const ejecutar = async (accion: () => Promise<void>, mensaje: string) => {
    setGuardando(true);
    setErrorFormulario('');
    try {
      await accion();
      exito(mensaje);
      setGuardando(false);
      cerrarModal();
      await cargar();
    } catch (fallo) {
      setErrorFormulario(obtenerMensajeError(fallo));
      setGuardando(false);
    }
  };

  const guardarCatalogo = (datos: CatalogoPayload) =>
    ejecutar(
      async () => {
        if (productoEdicion)
          await medicamentosService.actualizarCatalogo(
            productoEdicion.id,
            datos
          );
        else await medicamentosService.crearCatalogo(datos);
      },
      productoEdicion
        ? 'Medicamento actualizado en el catálogo.'
        : 'Medicamento agregado al catálogo.'
    );

  const guardarPrescripcion = (datos: MedicamentoPayload) =>
    ejecutar(async () => {
      await medicamentosService.crearPrescripcion(datos);
    }, 'Indicación médica registrada.');

  const abrirHistorial = async (fila: Medicamento) => {
    setSeleccionada(fila);
    setHistorial([]);
    setModal('historial');
    try {
      setHistorial(await medicamentosService.administraciones(fila.id));
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    }
  };

  const columnasCatalogo: TableColumn<MedicamentoCatalogo>[] = [
    {
      key: 'nombre',
      label: 'Medicamento',
      render: (fila) => (
        <div>
          <p className="farmacia__fuerte">{fila.nombre}</p>
          <p className="farmacia__secundario">
            {fila.principioActivo}
            {fila.activo ? '' : ' · inactivo'}
          </p>
        </div>
      ),
    },
    {
      key: 'dosisMg',
      label: 'Concentración',
      render: (fila) => (
        <span className="texto-mono">
          {fila.dosisMg} mg / {fila.unidad}
        </span>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (fila) => (
        <Badge
          tono={
            fila.stock === 0 ? 'critico' : fila.stockBajo ? 'aviso' : 'exito'
          }
          punto
        >
          {fila.stock} {fila.unidad} · mín. {fila.stockMinimo}
        </Badge>
      ),
    },
  ];

  if (gestionaCatalogo) {
    columnasCatalogo.push({
      key: 'acciones',
      label: 'Acciones',
      align: 'right',
      render: (fila) => (
        <Button
          variante="fantasma"
          tamano="sm"
          onClick={() => {
            setProductoEdicion(fila);
            setModal('catalogo');
          }}
        >
          Editar
        </Button>
      ),
    });
  }

  const columnasPrescripciones: TableColumn<Medicamento>[] = [
    {
      key: 'paciente',
      label: 'Paciente',
      render: (fila) => (
        <div>
          <p className="farmacia__fuerte">{fila.pacienteNombre}</p>
          <p className="farmacia__secundario">
            {fila.cuna === 'Sin cuna' ? 'Sin cuna' : `Cuna ${fila.cuna}`}
          </p>
        </div>
      ),
    },
    {
      key: 'medicamento',
      label: 'Indicación',
      render: (fila) => (
        <div>
          <p className="farmacia__fuerte">{fila.nombre}</p>
          <p className="farmacia__secundario">
            {fila.dosis} · {fila.unidadesPorDosis} {fila.unidad} por dosis
          </p>
        </div>
      ),
    },
    {
      key: 'via',
      label: 'Vía',
      render: (fila) => <span title={ETIQUETA_VIA[fila.via]}>{fila.via}</span>,
    },
    {
      key: 'esquema',
      label: 'Esquema',
      render: (fila) => (
        <div>
          <p>{describirEsquema(fila)}</p>
          <p className="farmacia__secundario">
            {fila.dosisAdministradas} dosis registradas
          </p>
        </div>
      ),
    },
    {
      key: 'proxima',
      label: 'Próxima dosis',
      render: (fila) =>
        fila.proximaDosis ? (
          <Badge tono={fila.atrasada ? 'critico' : 'info'} punto>
            {fila.atrasada ? 'Atrasada · ' : ''}
            {formatearFechaHora(fila.proximaDosis)}
          </Badge>
        ) : (
          <span className="farmacia__secundario">—</span>
        ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (fila) => (
        <Badge tono={TONO_ESTADO[fila.estado]} punto>
          {fila.estado}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      align: 'right',
      render: (fila) => (
        <div className="farmacia__acciones">
          {administra && esIndicacionVigente(fila) && (
            <Button
              variante="exito"
              tamano="sm"
              onClick={() => {
                setSeleccionada(fila);
                setModal('administrar');
              }}
            >
              Administrar
            </Button>
          )}
          <Button
            variante="fantasma"
            tamano="sm"
            onClick={() => void abrirHistorial(fila)}
          >
            Historial
          </Button>
          {prescribe && esIndicacionVigente(fila) && (
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={() => {
                setSeleccionada(fila);
                setModal('cancelar');
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="pagina farmacia">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Medicamentos</h2>
          <p className="pagina__descripcion">
            {vigentes.length} indicaciones vigentes · {atrasadas} con dosis
            atrasada · {stockCritico} productos con stock crítico.
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
          {pestana === 'inventario' && gestionaCatalogo && (
            <Button
              icono={<Icono nombre="mas" tamano={15} />}
              onClick={() => {
                setProductoEdicion(null);
                setModal('catalogo');
              }}
            >
              Nuevo medicamento
            </Button>
          )}
          {pestana === 'prescripciones' && prescribe && (
            <Button
              icono={<Icono nombre="mas" tamano={15} />}
              onClick={() => setModal('prescripcion')}
            >
              Nueva indicación
            </Button>
          )}
        </div>
      </header>

      <div
        className="farmacia__pestanas"
        role="tablist"
        aria-label="Secciones de farmacia"
      >
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'inventario'}
          className={`farmacia__pestana ${pestana === 'inventario' ? 'farmacia__pestana--activa' : ''}`}
          onClick={() => {
            setPestana('inventario');
            setBusqueda('');
          }}
        >
          <Icono nombre="medicamentos" tamano={15} />
          Catálogo
          <span className="farmacia__contador">{catalogo.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'prescripciones'}
          className={`farmacia__pestana ${pestana === 'prescripciones' ? 'farmacia__pestana--activa' : ''}`}
          onClick={() => {
            setPestana('prescripciones');
            setBusqueda('');
          }}
        >
          <Icono nombre="planes" tamano={15} />
          Indicaciones
          <span className="farmacia__contador">{prescripciones.length}</span>
        </button>
      </div>

      <div className="farmacia__herramientas">
        <div className="farmacia__buscador">
          <Icono nombre="buscar" tamano={16} />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder={
              pestana === 'inventario'
                ? 'Buscar medicamento o principio activo…'
                : 'Buscar por paciente o medicamento…'
            }
            aria-label="Buscar en medicamentos"
          />
        </div>
        {pestana === 'inventario' ? (
          <label className="farmacia__check">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(evento) => setSoloStockBajo(evento.target.checked)}
            />
            Solo stock crítico
          </label>
        ) : (
          <label className="farmacia__check">
            <input
              type="checkbox"
              checked={soloVigentes}
              onChange={(evento) => setSoloVigentes(evento.target.checked)}
            />
            Solo vigentes
          </label>
        )}
      </div>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {cargando ? (
        <Spinner bloque texto="Cargando farmacia…" />
      ) : pestana === 'inventario' ? (
        catalogoFiltrado.length === 0 ? (
          <EstadoVacio
            titulo="Sin productos en el catálogo"
            texto="Agrega el primer medicamento o ajusta la búsqueda."
            icono={<Icono nombre="medicamentos" tamano={28} />}
          />
        ) : (
          <section className="tarjeta tarjeta--sin-relleno">
            <Table
              columns={columnasCatalogo}
              data={catalogoFiltrado}
              rowKey={(fila) => fila.id}
              etiqueta="Catálogo de medicamentos"
            />
          </section>
        )
      ) : prescripcionesFiltradas.length === 0 ? (
        <EstadoVacio
          titulo="Sin indicaciones"
          texto={
            prescribe
              ? 'Crea una indicación para un paciente en la unidad.'
              : 'No hay indicaciones para este filtro.'
          }
          icono={<Icono nombre="planes" tamano={28} />}
        />
      ) : (
        <section className="tarjeta tarjeta--sin-relleno">
          <Table
            columns={columnasPrescripciones}
            data={prescripcionesFiltradas}
            rowKey={(fila) => fila.id}
            etiqueta="Indicaciones médicas"
          />
        </section>
      )}

      <Modal
        abierto={modal === 'catalogo'}
        titulo={productoEdicion ? 'Editar medicamento' : 'Nuevo medicamento'}
        descripcion="El stock se descuenta automáticamente al administrar cada dosis."
        onCerrar={cerrarModal}
      >
        <CatalogoForm
          producto={productoEdicion ?? undefined}
          guardando={guardando}
          error={errorFormulario}
          onSubmit={guardarCatalogo}
          onCancelar={cerrarModal}
        />
      </Modal>

      <Modal
        abierto={modal === 'prescripcion'}
        titulo="Nueva indicación médica"
        descripcion="Dosis única o recurrente cada N horas desde la primera dosis."
        onCerrar={cerrarModal}
        ancho="lg"
      >
        <PrescripcionForm
          pacientes={pacientes}
          catalogo={catalogo.filter((item) => item.activo)}
          guardando={guardando}
          error={errorFormulario}
          onSubmit={guardarPrescripcion}
          onCancelar={cerrarModal}
        />
      </Modal>

      <Modal
        abierto={modal === 'administrar'}
        titulo={`Administrar ${seleccionada?.nombre ?? ''}`}
        descripcion={`${seleccionada?.pacienteNombre ?? ''} · ${seleccionada?.dosis ?? ''}. Se descuentan ${seleccionada?.unidadesPorDosis ?? 1} ${seleccionada?.unidad ?? ''} del stock.`}
        onCerrar={cerrarModal}
        ancho="sm"
        pie={
          <>
            <Button
              variante="secundario"
              onClick={cerrarModal}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              variante="exito"
              cargando={guardando}
              onClick={() =>
                seleccionada &&
                void ejecutar(async () => {
                  await medicamentosService.administrar(seleccionada.id, {
                    programadaPara:
                      usarAtrasada && seleccionada.proximaDosis
                        ? seleccionada.proximaDosis
                        : undefined,
                    notas,
                  });
                }, `Dosis de ${seleccionada.nombre} registrada.`)
              }
            >
              Registrar dosis
            </Button>
          </>
        }
      >
        {errorFormulario && (
          <div className="mensaje mensaje--error" role="alert">
            <span aria-hidden="true">!</span>
            <span>{errorFormulario}</span>
          </div>
        )}
        {seleccionada?.atrasada && seleccionada.proximaDosis && (
          <label className="farmacia__check">
            <input
              type="checkbox"
              checked={usarAtrasada}
              onChange={(evento) => setUsarAtrasada(evento.target.checked)}
            />
            Registrar la dosis atrasada de las{' '}
            {formatearFechaHora(seleccionada.proximaDosis)}
          </label>
        )}
        <p className="farmacia__secundario">
          {usarAtrasada
            ? 'Se registra esa dosis específica.'
            : 'Se registra la dosis vigente (se admite hasta 60 minutos antes de su horario).'}
        </p>
        <div className="campo">
          <label className="campo__label" htmlFor="administrar-notas">
            Notas
          </label>
          <textarea
            id="administrar-notas"
            className="campo__control"
            value={notas}
            onChange={(evento) => setNotas(evento.target.value)}
            placeholder="Vía utilizada, tolerancia, incidencias…"
          />
        </div>
      </Modal>

      <Modal
        abierto={modal === 'cancelar'}
        titulo={`Cancelar indicación de ${seleccionada?.nombre ?? ''}`}
        descripcion="Las dosis ya registradas se conservan en el historial."
        onCerrar={cerrarModal}
        ancho="sm"
        pie={
          <>
            <Button
              variante="secundario"
              onClick={cerrarModal}
              disabled={guardando}
            >
              Volver
            </Button>
            <Button
              variante="peligro"
              cargando={guardando}
              onClick={() =>
                seleccionada &&
                void ejecutar(async () => {
                  await medicamentosService.cancelar(seleccionada.id, notas);
                }, 'Indicación cancelada.')
              }
            >
              Cancelar indicación
            </Button>
          </>
        }
      >
        {errorFormulario && (
          <div className="mensaje mensaje--error" role="alert">
            <span aria-hidden="true">!</span>
            <span>{errorFormulario}</span>
          </div>
        )}
        <div className="campo">
          <label className="campo__label" htmlFor="cancelar-motivo">
            Motivo
          </label>
          <textarea
            id="cancelar-motivo"
            className="campo__control"
            value={notas}
            onChange={(evento) => setNotas(evento.target.value)}
            placeholder="Ej. Ajuste de esquema según hemocultivo"
          />
        </div>
      </Modal>

      <Modal
        abierto={modal === 'historial'}
        titulo={`Historial de ${seleccionada?.nombre ?? ''}`}
        descripcion={`${seleccionada?.pacienteNombre ?? ''} · ${seleccionada ? describirEsquema(seleccionada) : ''}`}
        onCerrar={cerrarModal}
      >
        {historial.length === 0 ? (
          <p className="farmacia__secundario">Aún no se registran dosis.</p>
        ) : (
          <ul className="farmacia__historial">
            {historial.map((dosis) => (
              <li key={dosis.id}>
                <p className="farmacia__fuerte">
                  Dosis de las {formatearFechaHora(dosis.programadaPara)}
                </p>
                <p className="farmacia__secundario">
                  Administrada {formatearFechaHora(dosis.administradaEn)} por{' '}
                  {dosis.administradaPor} · {dosis.unidades}{' '}
                  {seleccionada?.unidad}
                  {dosis.notas ? ` · ${dosis.notas}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
