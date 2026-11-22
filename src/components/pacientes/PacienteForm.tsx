/**
 * @file PacienteForm.tsx
 * @description Formulario de ingreso y edición de pacientes. En edición, la
 * ficha clínica y el peso de nacimiento no se modifican; el diagnóstico y el
 * médico tratante solo los edita neonatología.
 * Los campos fijos usan `readOnly` y no `disabled`: react-hook-form descarta los
 * valores deshabilitados y la validación fallaría.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';

import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import {
  pacienteSchema,
  type PacienteFormData,
} from '@/schemas/pacienteSchema';
import type { Cuna } from '@/types/cuna';
import type {
  DatosTutor,
  Medico,
  Paciente,
  PacientePayload,
} from '@/types/paciente';

import './PacienteForm.css';

/** Propiedades del formulario `PacienteForm`. */
interface PacienteFormProps {
  /** Paciente existente a editar; si se omite, el formulario opera en modo ingreso nuevo. */
  paciente?: Paciente;
  /** Listado de médicos tratantes elegibles para asignar al paciente. */
  medicos: Medico[];
  /** Cunas disponibles para asignar directamente durante el ingreso. */
  cunas: Cuna[];
  /** Indica si el usuario actual tiene rol autorizado (neonatología) para editar diagnóstico y médico tratante. */
  puedeEditarDatosMedicos: boolean;
  /** Indica si la petición de guardado está en curso para deshabilitar los botones de acción. */
  guardando?: boolean;
  /** Mensaje de error global devuelto por el backend tras intentar guardar. */
  error?: string;
  /** Callback invocado con el payload normalizado (`PacientePayload`) tras superar la validación Zod. */
  onSubmit: (datos: PacientePayload) => void | Promise<void>;
  /** Callback invocado al cancelar y salir del formulario sin guardar cambios. */
  onCancelar: () => void;
}

/** Estructura inicial vacía para los datos de contacto de madre o padre. */
const TUTOR_VACIO: DatosTutor = {
  rut: '',
  nombres: '',
  apellidos: '',
  telefono: '',
};

/**
 * Construye el diccionario de valores por defecto para inicializar `react-hook-form`
 * a partir de un paciente existente o de cadenas vacías para un ingreso nuevo.
 *
 * @param paciente - Entidad `Paciente` opcional en modo edición.
 * @returns Objeto con claves alineadas a `PacienteFormData` listo para `defaultValues`.
 */
function valoresIniciales(
  paciente?: Paciente
): Record<keyof PacienteFormData, unknown> {
  return {
    identificador: paciente?.identificador ?? '',
    nombreCompleto: paciente?.nombreCompleto ?? '',
    sexo: paciente?.sexo ?? 'F',
    fechaNacimiento: paciente?.fechaNacimiento ?? '',
    edadGestacional: paciente?.edadGestacional ?? '',
    pesoNacimiento: paciente?.pesoNacimiento ?? '',
    peso: paciente?.peso ?? '',
    diagnostico: paciente?.diagnostico ?? '',
    medicoId: paciente?.medicoId ?? '',
    cunaId: '',
    madre: paciente ? { ...paciente.madre } : { ...TUTOR_VACIO },
    padre: paciente ? { ...paciente.padre } : { ...TUTOR_VACIO },
  };
}

/**
 * Renderiza el formulario clínico de ingreso y edición de pacientes neonatales.
 * Agrupa identificación/antropometría, datos médicos (con bloqueo por rol en edición)
 * y antecedentes familiares (madre y padre), validando mediante `pacienteSchema`.
 *
 * @param props - Propiedades del formulario (`PacienteFormProps`).
 * @returns Elemento `<form>` controlado con secciones clínicas y botones de confirmación/cancelación.
 */
export default function PacienteForm({
  paciente,
  medicos,
  cunas,
  puedeEditarDatosMedicos,
  guardando = false,
  error,
  onSubmit,
  onCancelar,
}: PacienteFormProps) {
  const edicion = Boolean(paciente);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PacienteFormData>({
    defaultValues: valoresIniciales(paciente) as PacienteFormData,
    // El esquema normaliza números con `preprocess`; el cast conserva el tipado del formulario
    resolver: zodResolver(pacienteSchema) as Resolver<PacienteFormData>,
  });

  const enviar = (datos: PacienteFormData) => {
    void onSubmit({
      identificador: datos.identificador,
      nombreCompleto: datos.nombreCompleto,
      sexo: datos.sexo,
      fechaNacimiento: datos.fechaNacimiento,
      edadGestacional: datos.edadGestacional,
      pesoNacimiento: datos.pesoNacimiento,
      peso: datos.peso ?? null,
      diagnostico: datos.diagnostico ?? '',
      medicoId: datos.medicoId ?? null,
      cunaId: datos.cunaId ?? null,
      madre: datos.madre,
      padre: datos.padre,
    });
  };

  const camposTutor = (clave: 'madre' | 'padre', titulo: string) => {
    const errores = errors[clave];
    return (
      <fieldset className="formulario-paciente__tutor">
        <legend className="formulario-paciente__subtitulo">{titulo}</legend>
        <div className="campo-fila">
          <Input
            etiqueta="Nombres"
            autoComplete="off"
            error={errores?.nombres?.message}
            {...register(`${clave}.nombres`)}
          />
          <Input
            etiqueta="Apellidos"
            autoComplete="off"
            error={errores?.apellidos?.message}
            {...register(`${clave}.apellidos`)}
          />
        </div>
        <div className="campo-fila">
          <Input
            etiqueta="RUT"
            placeholder="12.345.678-5"
            autoComplete="off"
            error={errores?.rut?.message}
            {...register(`${clave}.rut`)}
          />
          <Input
            etiqueta="Teléfono de contacto"
            type="tel"
            placeholder="+56 9 1234 5678"
            autoComplete="off"
            error={errores?.telefono?.message}
            {...register(`${clave}.telefono`)}
          />
        </div>
      </fieldset>
    );
  };

  return (
    <form
      className="formulario-paciente"
      onSubmit={handleSubmit(enviar)}
      noValidate
    >
      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <section className="formulario-paciente__seccion">
        <h3 className="formulario-paciente__titulo">Identificación</h3>
        <div className="campo-fila">
          <Input
            etiqueta="Ficha clínica (RN) *"
            placeholder="RN-2026-014"
            readOnly={edicion}
            error={errors.identificador?.message}
            {...register('identificador')}
          />
          <Input
            etiqueta="Nombre completo *"
            placeholder="RN Apellido (o nombre asignado)"
            error={errors.nombreCompleto?.message}
            {...register('nombreCompleto')}
          />
        </div>

        <div className="campo-fila campo-fila--3">
          <div className="campo">
            <label className="campo__label" htmlFor="sexo">
              Sexo *
            </label>
            <select
              id="sexo"
              className={`campo__control ${errors.sexo ? 'campo__control--error' : ''}`}
              {...register('sexo')}
            >
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
            {errors.sexo && (
              <span className="campo__error">{errors.sexo.message}</span>
            )}
          </div>

          <Input
            etiqueta="Fecha de nacimiento *"
            type="date"
            error={errors.fechaNacimiento?.message}
            {...register('fechaNacimiento')}
          />

          <Input
            etiqueta="Edad gestacional (semanas) *"
            type="number"
            min={20}
            max={45}
            step={0.1}
            error={errors.edadGestacional?.message}
            {...register('edadGestacional')}
          />
        </div>

        <div className="campo-fila campo-fila--3">
          <Input
            etiqueta="Peso de nacimiento (g) *"
            type="number"
            min={200}
            max={8000}
            step={1}
            readOnly={edicion}
            error={errors.pesoNacimiento?.message}
            {...register('pesoNacimiento')}
          />
          {!edicion && (
            <Input
              etiqueta="Peso actual (g)"
              type="number"
              min={200}
              max={10000}
              step={1}
              placeholder="Igual al de nacimiento"
              error={errors.peso?.message}
              {...register('peso')}
            />
          )}
          {!edicion && (
            <div className="campo">
              <label className="campo__label" htmlFor="cunaId">
                Cuna de ingreso
              </label>
              <select
                id="cunaId"
                className="campo__control"
                {...register('cunaId')}
              >
                <option value="">Asignar más tarde</option>
                {cunas.map((cuna) => (
                  <option key={cuna.id} value={cuna.id}>
                    {cuna.identificador} · {cuna.ubicacion || cuna.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      <section className="formulario-paciente__seccion">
        <h3 className="formulario-paciente__titulo">Información clínica</h3>
        {!puedeEditarDatosMedicos && edicion && (
          <p className="texto-muted">
            El diagnóstico y el médico tratante solo los modifica neonatología.
          </p>
        )}

        <div className="campo">
          <label className="campo__label" htmlFor="medicoId">
            Médico tratante
          </label>
          <select
            id="medicoId"
            className="campo__control"
            disabled={edicion && !puedeEditarDatosMedicos}
            {...register('medicoId')}
          >
            <option value="">Sin asignar</option>
            {medicos.map((medico) => (
              <option key={medico.id} value={medico.id}>
                {medico.nombreCompleto}
                {medico.turno ? ` · ${medico.turno}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label className="campo__label" htmlFor="diagnostico">
            Diagnóstico de ingreso
          </label>
          <textarea
            id="diagnostico"
            className="campo__control"
            placeholder="Diagnóstico principal y comorbilidades"
            disabled={edicion && !puedeEditarDatosMedicos}
            {...register('diagnostico')}
          />
          {errors.diagnostico && (
            <span className="campo__error">{errors.diagnostico.message}</span>
          )}
        </div>
      </section>

      <section className="formulario-paciente__seccion">
        <h3 className="formulario-paciente__titulo">Madre y padre</h3>
        <p className="texto-muted">
          Datos de contacto de la familia. Todos son opcionales; el RUT y el
          teléfono se validan si se completan.
        </p>
        {camposTutor('madre', 'Madre')}
        {camposTutor('padre', 'Padre')}
      </section>

      <footer className="formulario-paciente__pie">
        <Button variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          {edicion ? 'Guardar cambios' : 'Registrar paciente'}
        </Button>
      </footer>
    </form>
  );
}