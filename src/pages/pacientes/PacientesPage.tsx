/**
 * @file PacientesPage.tsx
 * @description Listado clínico de pacientes en dos secciones: los que están en
 * la unidad y los que ya no están activos (egresados, trasladados o
 * fallecidos). Incluye búsqueda, filtros, paginación, egreso y, para
 * administración, la eliminación definitiva.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { obtenerMensajeError } from '@/api/axios';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EstadoVacio from '@/components/ui/EstadoVacio/EstadoVacio';
import Icono from '@/components/ui/Iconos/Iconos';
import Spinner from '@/components/ui/Spinner/Spinner';
import Table, { type TableColumn } from '@/components/ui/Table/Table';
import ModalEgreso from '@/components/pacientes/ModalEgreso';
import ModalEliminarPaciente from '@/components/pacientes/ModalEliminarPaciente';
import { useAuth } from '@/context/AuthContext';
import {
  ETIQUETA_ESTADO_PACIENTE,
  ETIQUETA_RESULTADO,
} from '@/api/mappers/pacientes';
import { pacientesService } from '@/services/pacientesService';
import { reportesService } from '@/services/reportesService';
import type { FiltrosPacientes, Paciente } from '@/types/paciente';
import type { ResumenOperacion } from '@/types/reporte';
import {
  esAdministrador,
  esMedico,
  puedeAdmitirPaciente,
  puedeGestionarClinica,
} from '@/utils/roles';
import { formatearFecha, formatearEdadGestacional } from '@/utils/fechas';
import { formatearEdadDias, truncar } from '@/utils/calculos';

import './PacientesPage.css';

/** Secciones del listado: en la unidad o fuera de ella. */
type Vista = 'unidad' | 'inactivos';
/** Estados posibles dentro de la sección de inactivos. */
type FiltroInactivo = 'todos' | 'egresado' | 'trasladado' | 'fallecido';
type FiltroSexo = 'todos' | 'F' | 'M';

const POR_PAGINA = 8;

export default function PacientesPage() {
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const medico = esMedico(usuario);
  const admite = puedeGestionarClinica(usuario);
  const puedeAdmitir = puedeAdmitirPaciente(usuario);
  const administra = esAdministrador(usuario);
  const [parametros, setParametros] = useSearchParams();
  const vista: Vista =
    parametros.get('vista') === 'inactivos' ? 'inactivos' : 'unidad';

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState<ResumenOperacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [estadoInactivo, setEstadoInactivo] = useState<FiltroInactivo>('todos');
  const [sexo, setSexo] = useState<FiltroSexo>('todos');
  const [pagina, setPagina] = useState(1);
  const [pacienteAlta, setPacienteAlta] = useState<Paciente | null>(null);
  const [pacienteEliminar, setPacienteEliminar] = useState<Paciente | null>(
    null
  );

  const cambiarVista = (siguiente: Vista) => {
    setParametros(siguiente === 'inactivos' ? { vista: 'inactivos' } : {});
    setEstadoInactivo('todos');
    setPagina(1);
  };

  // Evita una consulta por cada tecla
  useEffect(() => {
    const espera = window.setTimeout(() => setBusquedaAplicada(busqueda), 300);
    return () => window.clearTimeout(espera);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const porEstado: FiltrosPacientes =
        vista === 'unidad'
          ? { activo: true }
          : estadoInactivo === 'todos'
            ? { activo: false }
            : { estado: estadoInactivo };
      const respuesta = await pacientesService.listar(
        {
          ...porEstado,
          search: busquedaAplicada,
          sexo: sexo === 'todos' ? undefined : sexo,
          pagina,
        },
        POR_PAGINA
      );
      setPacientes(respuesta.pacientes);
      setTotal(respuesta.total);
    } catch (fallo) {
      setError(obtenerMensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [busquedaAplicada, vista, estadoInactivo, sexo, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    reportesService
      .reporte()
      .then(({ resumen: datos }) => setResumen(datos))
      .catch(() => setResumen(null));
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = pacientes;

  const columnas: TableColumn<Paciente>[] = [
    {
      key: 'paciente',
      label: 'Paciente',
      render: (fila) => (
        <div className="pacientes__celda-paciente">
          <span className="pacientes__avatar" aria-hidden="true">
            {fila.nombreCompleto.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="pacientes__nombre">{fila.nombreCompleto}</p>
            <p className="pacientes__identificador">{fila.identificador}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'sexo',
      label: 'Sexo',
      render: (fila) => (fila.sexo === 'F' ? 'Femenino' : 'Masculino'),
    },
    {
      key: 'edad',
      label: 'Edad',
      render: (fila) => (
        <span>
          {formatearEdadDias(fila.edadDias)}
          <span className="pacientes__secundario">
            {' · '}
            {formatearEdadGestacional(fila.edadGestacional)}
          </span>
        </span>
      ),
    },
    vista === 'unidad'
      ? {
          key: 'cuna',
          label: 'Cuna',
          render: (fila) =>
            fila.cunaIdentificador ? (
              <span className="pacientes__cuna">{fila.cunaIdentificador}</span>
            ) : (
              <span className="texto-muted">Sin cuna</span>
            ),
        }
      : {
          key: 'egreso',
          label: 'Egreso',
          render: (fila) => (
            <span>
              {formatearFecha(fila.fechaAlta)}
              {fila.resultadoAlta && (
                <span className="pacientes__secundario">
                  {' · '}
                  {ETIQUETA_RESULTADO[fila.resultadoAlta]}
                </span>
              )}
            </span>
          ),
        },
    {
      key: 'medico',
      label: 'Médico a cargo',
      render: (fila) => (
        <span title={fila.medicoNombre ?? ''}>
          {fila.medicoNombre ? truncar(fila.medicoNombre, 26) : '—'}
        </span>
      ),
    },
    {
      key: 'ingreso',
      label: 'Ingreso',
      render: (fila) => formatearFecha(fila.fechaIngreso),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (fila) => (
        <Badge tono={fila.activo ? 'exito' : 'neutro'} punto>
          {ETIQUETA_ESTADO_PACIENTE[fila.estado]}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      align: 'right',
      render: (fila) => (
        <div className="pacientes__acciones">
          <Button
            variante="fantasma"
            tamano="sm"
            onClick={() => navegar(`/pacientes/${fila.id}`)}
            aria-label={`Ver ficha de ${fila.nombreCompleto}`}
          >
            Ver
          </Button>
          {admite && fila.activo && (
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={() => navegar(`/pacientes/${fila.id}/editar`)}
              aria-label={`Editar ${fila.nombreCompleto}`}
            >
              Editar
            </Button>
          )}
          {medico && fila.activo && (
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={() => setPacienteAlta(fila)}
            >
              Egreso
            </Button>
          )}
          {administra && (
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={() => setPacienteEliminar(fila)}
              aria-label={`Eliminar definitivamente a ${fila.nombreCompleto}`}
            >
              <Icono nombre="papelera" tamano={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="pagina pacientes">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Pacientes</h2>
          <p className="pagina__descripcion">
            {resumen
              ? `${resumen.pacientesActivos} pacientes en la unidad · ${resumen.cunasOcupadas} cunas ocupadas · ${resumen.totalPacientes} registros históricos.`
              : 'Pacientes de la unidad neonatal.'}
          </p>
        </div>
        {puedeAdmitir && (
          <div className="pagina__acciones">
            <Link
              to="/pacientes/nuevo"
              className="boton boton--primario boton--md"
            >
              <Icono nombre="mas" tamano={15} />
              Nuevo paciente
            </Link>
          </div>
        )}
      </header>

      <div
        className="pacientes__pestanas"
        role="tablist"
        aria-label="Secciones de pacientes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'unidad'}
          className={`pacientes__pestana ${vista === 'unidad' ? 'pacientes__pestana--activa' : ''}`}
          onClick={() => cambiarVista('unidad')}
        >
          <Icono nombre="cunas" tamano={15} />
          En la unidad
          {resumen && (
            <span className="pacientes__contador">
              {resumen.pacientesActivos}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'inactivos'}
          className={`pacientes__pestana ${vista === 'inactivos' ? 'pacientes__pestana--activa' : ''}`}
          onClick={() => cambiarVista('inactivos')}
        >
          <Icono nombre="alta" tamano={15} />
          Egresados e inactivos
          {resumen && (
            <span className="pacientes__contador">
              {resumen.pacientesDadosDeAlta}
            </span>
          )}
        </button>
      </div>

      <section className="pacientes__filtros" aria-label="Filtros de pacientes">
        <div className="pacientes__buscador">
          <Icono nombre="buscar" tamano={16} />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => {
              setBusqueda(evento.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por nombre o ficha clínica…"
            aria-label="Buscar paciente"
          />
        </div>

        <div className="pacientes__grupo-filtros">
          {vista === 'inactivos' && (
            <select
              className="campo__control"
              value={estadoInactivo}
              onChange={(evento) => {
                setEstadoInactivo(evento.target.value as FiltroInactivo);
                setPagina(1);
              }}
              aria-label="Filtrar por motivo de salida"
            >
              <option value="todos">Todos los inactivos</option>
              <option value="egresado">Egresados (alta)</option>
              <option value="trasladado">Trasladados</option>
              <option value="fallecido">Fallecidos</option>
            </select>
          )}

          <select
            className="campo__control"
            value={sexo}
            onChange={(evento) => {
              setSexo(evento.target.value as FiltroSexo);
              setPagina(1);
            }}
            aria-label="Filtrar por sexo"
          >
            <option value="todos">Todos los sexos</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </select>

          <Button
            variante="secundario"
            onClick={() => void cargar()}
            cargando={cargando}
          >
            Actualizar
          </Button>
        </div>
      </section>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {cargando ? (
        <Spinner bloque texto="Cargando pacientes…" />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          titulo={
            vista === 'unidad'
              ? 'No se encontraron pacientes'
              : 'No hay pacientes inactivos'
          }
          texto={
            vista === 'unidad'
              ? 'Ajusta los filtros o registra un nuevo ingreso.'
              : 'Aquí aparecen los pacientes egresados, trasladados o fallecidos.'
          }
          icono={<Icono nombre="pacientes" tamano={28} />}
          accion={
            puedeAdmitir && vista === 'unidad' ? (
              <Link
                to="/pacientes/nuevo"
                className="boton boton--primario boton--md"
              >
                Registrar paciente
              </Link>
            ) : undefined
          }
        />
      ) : (
        <section className="tarjeta tarjeta--sin-relleno">
          <Table
            columns={columnas}
            data={visibles}
            rowKey={(fila) => fila.id}
            etiqueta={
              vista === 'unidad'
                ? 'Pacientes en la unidad'
                : 'Pacientes egresados e inactivos'
            }
            onRowClick={(fila) => navegar(`/pacientes/${fila.id}`)}
          />
        </section>
      )}

      <footer className="pacientes__pie">
        <p>
          Mostrando {visibles.length} de {total} pacientes
        </p>
        <div className="pacientes__paginacion">
          <Button
            variante="secundario"
            tamano="sm"
            disabled={paginaActual <= 1}
            onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
          >
            Anterior
          </Button>
          <span>
            Página {paginaActual} de {totalPaginas}
          </span>
          <Button
            variante="secundario"
            tamano="sm"
            disabled={paginaActual >= totalPaginas}
            onClick={() =>
              setPagina((valor) => Math.min(totalPaginas, valor + 1))
            }
          >
            Siguiente
          </Button>
        </div>
      </footer>

      <ModalEgreso
        paciente={pacienteAlta}
        onCerrar={() => setPacienteAlta(null)}
        onEgresado={() => {
          setPacienteAlta(null);
          void cargar();
        }}
      />

      <ModalEliminarPaciente
        paciente={pacienteEliminar}
        onCerrar={() => setPacienteEliminar(null)}
        onEliminado={() => {
          setPacienteEliminar(null);
          void cargar();
        }}
      />
    </div>
  );
}
