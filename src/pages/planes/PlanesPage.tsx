/**
 * @file PlanesPage.tsx
 * @description Gestión de planes de cuidado neonatal: listado filtrable,
 * alta y edición mediante formulario validado y eliminación con confirmación.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

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
import { planSchema, type PlanFormData } from '@/schemas/planSchema';
import { pacientesService } from '@/services/pacientesService';
import { planesService } from '@/services/planesService';
import type { Paciente } from '@/types/paciente';
import type { EstadoPlan, PlanCuidado, PlanPayload } from '@/types/plan';
import { truncar } from '@/utils/calculos';
import { puedeGestionarClinica } from '@/utils/roles';

import './PlanesPage.css';

/** Filtro de estado del listado. */
type FiltroEstado = 'todos' | EstadoPlan;

/** Etiqueta legible y tono de cada estado del plan. */
const ESTADOS: Array<{
  valor: EstadoPlan;
  etiqueta: string;
  tono: 'exito' | 'aviso' | 'neutro';
}> = [
  { valor: 'Activo', etiqueta: 'Activo', tono: 'exito' },
  { valor: 'Suspendido', etiqueta: 'Suspendido', tono: 'aviso' },
  { valor: 'Finalizado', etiqueta: 'Finalizado', tono: 'neutro' },
];

/**
 * Devuelve la configuración visual de un estado.
 *
 * @param estado - Estado del plan.
 * @returns Etiqueta y tono del badge.
 */
function presentarEstado(estado: EstadoPlan) {
  return ESTADOS.find((item) => item.valor === estado) ?? ESTADOS[0];
}

/** Propiedades del formulario de plan. */
interface PlanFormProps {
  /** Plan a editar; ausente cuando se crea uno nuevo. */
  plan?: PlanCuidado;
  /** Pacientes activos disponibles. */
  pacientes: Paciente[];
  /** Indica que la petición está en curso. */
  guardando: boolean;
  /** Error devuelto por la API. */
  error?: string;
  /** Acción con el payload validado. */
  onSubmit: (datos: PlanPayload) => void | Promise<void>;
  /** Acción de cancelación. */
  onCancelar: () => void;
}

/**
 * Formulario de alta y edición de planes de cuidado.
 *
 * @param props - Plan, pacientes y acciones.
 * @returns Campos del protocolo clínico.
 */
function PlanForm({
  plan,
  pacientes,
  guardando,
  error,
  onSubmit,
  onCancelar,
}: PlanFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanFormData>({
    defaultValues: {
      paciente: plan?.pacienteId,
      areaCuidado: plan?.areaCuidado ?? '',
      intervencion: plan?.intervencion ?? '',
      frecuencia: plan?.frecuencia ?? '',
      estado: plan?.estado ?? 'Activo',
    },
    // El esquema normaliza números con `preprocess`; el cast conserva el
    // tipado del formulario sin desactivar la validación real de Zod.
    resolver: zodResolver(planSchema) as Resolver<PlanFormData>,
  });

  /**
   * Traduce los valores del formulario al contrato del servicio.
   *
   * @param datos - Datos validados.
   */
  const enviar = (datos: PlanFormData) => {
    void onSubmit({
      paciente: Number(datos.paciente),
      areaCuidado: datos.areaCuidado,
      intervencion: datos.intervencion,
      frecuencia: datos.frecuencia,
      estado: datos.estado,
    });
  };

  return (
    <form
      className="formulario-plan"
      onSubmit={handleSubmit(enviar)}
      noValidate
    >
      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="campo">
        <label className="campo__label" htmlFor="plan-paciente">
          Paciente *
        </label>
        {plan && <input type="hidden" {...register('paciente')} />}
        <select
          id="plan-paciente"
          className={`campo__control ${
            errors.paciente ? 'campo__control--error' : ''
          }`}
          {...(plan
            ? { value: plan.pacienteId, disabled: true }
            : register('paciente'))}
        >
          {plan ? (
            <option value={plan.pacienteId}>{plan.pacienteNombre}</option>
          ) : (
            <option value="">Selecciona un paciente…</option>
          )}
          {!plan &&
            pacientes.map((paciente) => (
              <option key={paciente.id} value={paciente.id}>
                {paciente.nombreCompleto} · {paciente.identificador}
                {paciente.cunaIdentificador
                  ? ` · Cuna ${paciente.cunaIdentificador}`
                  : ''}
              </option>
            ))}
        </select>
        {errors.paciente && (
          <span className="campo__error">{errors.paciente.message}</span>
        )}
      </div>

      <div className="campo-fila">
        <div className="campo">
          <label className="campo__label" htmlFor="plan-area">
            Área de cuidado *
          </label>
          <input
            id="plan-area"
            type="text"
            className={`campo__control ${
              errors.areaCuidado ? 'campo__control--error' : ''
            }`}
            placeholder="Ej. Termorregulación"
            {...register('areaCuidado')}
          />
          {errors.areaCuidado && (
            <span className="campo__error">{errors.areaCuidado.message}</span>
          )}
        </div>

        <div className="campo">
          <label className="campo__label" htmlFor="plan-frecuencia">
            Frecuencia *
          </label>
          <input
            id="plan-frecuencia"
            type="text"
            className={`campo__control ${
              errors.frecuencia ? 'campo__control--error' : ''
            }`}
            placeholder="Ej. Cada 4 horas"
            {...register('frecuencia')}
          />
          {errors.frecuencia && (
            <span className="campo__error">{errors.frecuencia.message}</span>
          )}
        </div>
      </div>

      <div className="campo">
        <label className="campo__label" htmlFor="plan-intervencion">
          Intervención *
        </label>
        <textarea
          id="plan-intervencion"
          className={`campo__control ${
            errors.intervencion ? 'campo__control--error' : ''
          }`}
          placeholder="Describe la intervención de enfermería y su objetivo"
          {...register('intervencion')}
        />
        {errors.intervencion && (
          <span className="campo__error">{errors.intervencion.message}</span>
        )}
      </div>

      <div className="campo">
        <label className="campo__label" htmlFor="plan-estado">
          Estado *
        </label>
        <select
          id="plan-estado"
          className="campo__control"
          {...register('estado')}
        >
          {ESTADOS.map((estado) => (
            <option key={estado.valor} value={estado.valor}>
              {estado.etiqueta}
            </option>
          ))}
        </select>
        {errors.estado && (
          <span className="campo__error">{errors.estado.message}</span>
        )}
      </div>

      <div className="formulario-plan__pie">
        <Button variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          {plan ? 'Guardar cambios' : 'Crear plan'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Página de planes de cuidado.
 *
 * @returns Listado con filtros y acciones de gestión.
 */
export default function PlanesPage() {
  const { usuario } = useAuth();
  const { exito, error: notificarError } = useToast();
  const puedeEscribir = puedeGestionarClinica(usuario);

  const [planes, setPlanes] = useState<PlanCuidado[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('todos');
  const [pacienteFiltro, setPacienteFiltro] = useState('todos');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [planEdicion, setPlanEdicion] = useState<PlanCuidado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState('');

  const [planAEliminar, setPlanAEliminar] = useState<PlanCuidado | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /**
   * Carga planes y pacientes activos en paralelo.
   */
  const cargar = async () => {
    setCargando(true);
    setError('');

    try {
      const [listaPlanes, { pacientes: listaPacientes }] = await Promise.all([
        planesService.listar(),
        pacientesService.listar({ estado: 'activo' }, 100),
      ]);
      // El plan no trae la cuna: se toma del paciente (si sigue en la unidad)
      const cunaDe = new Map(
        listaPacientes.map((p) => [p.id, p.cunaIdentificador])
      );
      setPlanes(
        listaPlanes.map((plan) => ({
          ...plan,
          cuna: cunaDe.get(plan.pacienteId) ?? 'Sin cuna',
        }))
      );
      setPacientes(listaPacientes);
    } catch (fallo) {
      setError(obtenerMensajeError(fallo));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return planes.filter((plan) => {
      const coincideTexto =
        !texto ||
        plan.pacienteNombre.toLowerCase().includes(texto) ||
        plan.areaCuidado.toLowerCase().includes(texto) ||
        plan.intervencion.toLowerCase().includes(texto);
      const coincideEstado = estado === 'todos' || plan.estado === estado;
      const coincidePaciente =
        pacienteFiltro === 'todos' ||
        plan.pacienteId === Number(pacienteFiltro);

      return coincideTexto && coincideEstado && coincidePaciente;
    });
  }, [planes, busqueda, estado, pacienteFiltro]);

  const activos = planes.filter((plan) => plan.estado === 'Activo').length;
  const pacientesConPlan = new Set(planes.map((plan) => plan.pacienteId)).size;

  /**
   * Abre el formulario en modo creación o edición.
   *
   * @param plan - Plan a editar o `null` para crear.
   */
  const abrirFormulario = (plan: PlanCuidado | null) => {
    setPlanEdicion(plan);
    setErrorFormulario('');
    setModalAbierto(true);
  };

  /**
   * Persiste el plan y refresca el listado.
   *
   * @param datos - Payload validado.
   */
  const guardar = async (datos: PlanPayload) => {
    setGuardando(true);
    setErrorFormulario('');

    try {
      if (planEdicion) {
        await planesService.actualizar(planEdicion.id, datos);
        exito('Plan de cuidado actualizado.');
      } else {
        await planesService.crear(datos);
        exito('Plan de cuidado creado.');
      }
      setModalAbierto(false);
      setPlanEdicion(null);
      await cargar();
    } catch (fallo) {
      setErrorFormulario(obtenerMensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Elimina el plan seleccionado tras la confirmación.
   */
  const confirmarEliminacion = async () => {
    if (!planAEliminar) return;

    setEliminando(true);
    try {
      await planesService.suspender(planAEliminar.id);
      exito('Plan de cuidado suspendido.');
      setPlanAEliminar(null);
      await cargar();
    } catch (fallo) {
      notificarError(obtenerMensajeError(fallo));
    } finally {
      setEliminando(false);
    }
  };

  const columnas: TableColumn<PlanCuidado>[] = [
    {
      key: 'paciente',
      label: 'Paciente',
      render: (fila) => (
        <div>
          <p className="planes__fuerte">{fila.pacienteNombre}</p>
          <p className="planes__secundario">
            {fila.cuna === 'Sin cuna' ? 'Sin cuna' : `Cuna ${fila.cuna}`}
          </p>
        </div>
      ),
    },
    {
      key: 'areaCuidado',
      label: 'Área de cuidado',
      render: (fila) => (
        <span className="planes__area">{fila.areaCuidado}</span>
      ),
    },
    {
      key: 'intervencion',
      label: 'Intervención',
      render: (fila) => (
        <span title={fila.intervencion}>{truncar(fila.intervencion, 70)}</span>
      ),
    },
    {
      key: 'frecuencia',
      label: 'Frecuencia',
      render: (fila) => <span className="texto-mono">{fila.frecuencia}</span>,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (fila) => {
        const configuracion = presentarEstado(fila.estado);
        return (
          <Badge tono={configuracion.tono} punto>
            {configuracion.etiqueta}
          </Badge>
        );
      },
    },
  ];

  if (puedeEscribir) {
    columnas.push({
      key: 'acciones',
      label: 'Acciones',
      align: 'right',
      render: (fila) => (
        <div className="planes__acciones">
          <Button
            variante="fantasma"
            tamano="sm"
            onClick={() => abrirFormulario(fila)}
          >
            Editar
          </Button>
          {fila.estado === 'Activo' && (
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={() => setPlanAEliminar(fila)}
            >
              Suspender
            </Button>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="pagina planes">
      <header className="pagina__cabecera">
        <div>
          <h2 className="pagina__titulo">Planes de cuidado</h2>
          <p className="pagina__descripcion">
            {activos} planes activos · {pacientesConPlan} pacientes con
            protocolo · {planes.length} registros históricos.
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
          {puedeEscribir && (
            <Button
              icono={<Icono nombre="mas" tamano={15} />}
              onClick={() => abrirFormulario(null)}
            >
              Nuevo plan
            </Button>
          )}
        </div>
      </header>

      <section className="planes__filtros" aria-label="Filtros de planes">
        <div className="planes__buscador">
          <Icono nombre="buscar" tamano={16} />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por paciente, área o intervención…"
            aria-label="Buscar plan de cuidado"
          />
        </div>

        <div className="planes__grupo-filtros">
          <select
            className="campo__control"
            value={estado}
            onChange={(evento) =>
              setEstado(evento.target.value as FiltroEstado)
            }
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.etiqueta}
              </option>
            ))}
          </select>

          <select
            className="campo__control"
            value={pacienteFiltro}
            onChange={(evento) => setPacienteFiltro(evento.target.value)}
            aria-label="Filtrar por paciente"
          >
            <option value="todos">Todos los pacientes</option>
            {pacientes.map((paciente) => (
              <option key={paciente.id} value={paciente.id}>
                {paciente.nombreCompleto}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {cargando ? (
        <Spinner bloque texto="Cargando planes de cuidado…" />
      ) : filtrados.length === 0 ? (
        <EstadoVacio
          titulo="Sin planes de cuidado"
          texto="Ajusta los filtros o crea el primer protocolo para un paciente activo."
          icono={<Icono nombre="planes" tamano={28} />}
          accion={
            puedeEscribir ? (
              <Button onClick={() => abrirFormulario(null)}>Crear plan</Button>
            ) : undefined
          }
        />
      ) : (
        <section className="tarjeta tarjeta--sin-relleno">
          <Table
            columns={columnas}
            data={filtrados}
            rowKey={(fila) => fila.id}
            etiqueta="Planes de cuidado"
          />
        </section>
      )}

      <Modal
        abierto={modalAbierto}
        titulo={
          planEdicion ? 'Editar plan de cuidado' : 'Nuevo plan de cuidado'
        }
        descripcion="Los planes describen intervenciones de enfermería y su frecuencia."
        onCerrar={() => {
          if (!guardando) {
            setModalAbierto(false);
            setPlanEdicion(null);
          }
        }}
        ancho="md"
      >
        <PlanForm
          plan={planEdicion ?? undefined}
          pacientes={pacientes}
          guardando={guardando}
          error={errorFormulario}
          onSubmit={guardar}
          onCancelar={() => {
            if (!guardando) {
              setModalAbierto(false);
              setPlanEdicion(null);
            }
          }}
        />
      </Modal>

      <Modal
        abierto={Boolean(planAEliminar)}
        titulo="Suspender plan de cuidado"
        descripcion="Los planes no se eliminan para conservar el historial clínico; el cambio queda en la auditoría."
        onCerrar={() => {
          if (!eliminando) setPlanAEliminar(null);
        }}
        ancho="sm"
        pie={
          <>
            <Button
              variante="secundario"
              onClick={() => setPlanAEliminar(null)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button
              variante="peligro"
              onClick={() => void confirmarEliminacion()}
              cargando={eliminando}
            >
              Suspender plan
            </Button>
          </>
        }
      >
        <p className="planes__confirmacion">
          Se suspenderá el plan de <strong>{planAEliminar?.areaCuidado}</strong>{' '}
          de <strong>{planAEliminar?.pacienteNombre}</strong>. Puedes
          reactivarlo editándolo más tarde.
        </p>
      </Modal>
    </div>
  );
}
