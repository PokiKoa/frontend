/**
 * @file MedicamentoFormularios.tsx
 * @description Formularios del catálogo de farmacia y de indicaciones médicas.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';

import { ETIQUETA_VIA } from '@/api/mappers/medicamentos';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import {
  catalogoSchema,
  prescripcionSchema,
  type CatalogoFormData,
  type PrescripcionFormData,
} from '@/schemas/medicamentoSchema';
import type {
  CatalogoPayload,
  MedicamentoCatalogo,
  MedicamentoPayload,
  ViaAdministracion,
} from '@/types/medicamento';
import type { Paciente } from '@/types/paciente';

function MensajeError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <div className="mensaje mensaje--error" role="alert">
      <span aria-hidden="true">!</span>
      <span>{mensaje}</span>
    </div>
  );
}

interface CatalogoFormProps {
  producto?: MedicamentoCatalogo;
  guardando?: boolean;
  error?: string;
  onSubmit: (datos: CatalogoPayload) => void | Promise<void>;
  onCancelar: () => void;
}

export function CatalogoForm({
  producto,
  guardando = false,
  error,
  onSubmit,
  onCancelar,
}: CatalogoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CatalogoFormData>({
    defaultValues: {
      nombre: producto?.nombre ?? '',
      principioActivo: producto?.principioActivo ?? '',
      dosisMg: producto?.dosisMg ?? ('' as unknown as number),
      unidad: producto?.unidad ?? 'ampolla',
      stock: producto?.stock ?? 0,
      stockMinimo: producto?.stockMinimo ?? 5,
      activo: producto?.activo ?? true,
    },
    resolver: zodResolver(catalogoSchema) as Resolver<CatalogoFormData>,
  });

  return (
    <form
      className="formulario-medicamento"
      onSubmit={handleSubmit((datos) => void onSubmit(datos))}
      noValidate
    >
      <MensajeError mensaje={error} />

      <Input
        etiqueta="Nombre comercial *"
        placeholder="Ej. Cafeína citrato 20 mg/ml"
        error={errors.nombre?.message}
        {...register('nombre')}
      />
      <Input
        etiqueta="Principio activo *"
        placeholder="Ej. Citrato de cafeína"
        error={errors.principioActivo?.message}
        {...register('principioActivo')}
      />
      <div className="campo-fila">
        <Input
          etiqueta="Concentración (mg) *"
          type="number"
          min={0.01}
          step={0.01}
          error={errors.dosisMg?.message}
          {...register('dosisMg')}
        />
        <Input
          etiqueta="Unidad de dispensación *"
          placeholder="ampolla, vial, frasco…"
          error={errors.unidad?.message}
          {...register('unidad')}
        />
      </div>
      <div className="campo-fila">
        <Input
          etiqueta="Stock disponible *"
          type="number"
          min={0}
          step={1}
          error={errors.stock?.message}
          {...register('stock')}
        />
        <Input
          etiqueta="Alerta de stock mínimo *"
          type="number"
          min={0}
          step={1}
          error={errors.stockMinimo?.message}
          {...register('stockMinimo')}
        />
      </div>
      <label className="farmacia__check">
        <input type="checkbox" {...register('activo')} />
        Disponible para nuevas indicaciones
      </label>

      <div className="formulario-medicamento__pie">
        <Button variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          {producto ? 'Guardar cambios' : 'Agregar al catálogo'}
        </Button>
      </div>
    </form>
  );
}

interface PrescripcionFormProps {
  pacientes: Paciente[];
  catalogo: MedicamentoCatalogo[];
  guardando?: boolean;
  error?: string;
  onSubmit: (datos: MedicamentoPayload) => void | Promise<void>;
  onCancelar: () => void;
}

/** Fecha y hora local actual en formato `YYYY-MM-DDTHH:mm` para inputs datetime-local. */
function ahoraLocal(): string {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset(), 0, 0);
  return ahora.toISOString().slice(0, 16);
}

export function PrescripcionForm({
  pacientes,
  catalogo,
  guardando = false,
  error,
  onSubmit,
  onCancelar,
}: PrescripcionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PrescripcionFormData>({
    defaultValues: {
      via: 'IV',
      unidadesPorDosis: 1,
      inicio: ahoraLocal(),
    } as Partial<PrescripcionFormData>,
    resolver: zodResolver(prescripcionSchema) as Resolver<PrescripcionFormData>,
  });
  const recurrente = Boolean(watch('frecuenciaHoras'));

  const enviar = (datos: PrescripcionFormData) =>
    void onSubmit({
      paciente: datos.paciente,
      medicamentoId: datos.medicamentoId,
      dosis: datos.dosis,
      unidadesPorDosis: datos.unidadesPorDosis,
      via: datos.via,
      inicio: datos.inicio,
      frecuenciaHoras: datos.frecuenciaHoras ?? null,
      fin: datos.fin || null,
    });

  return (
    <form
      className="formulario-medicamento"
      onSubmit={handleSubmit(enviar)}
      noValidate
    >
      <MensajeError mensaje={error} />

      <div className="campo-fila">
        <div className="campo">
          <label className="campo__label" htmlFor="presc-paciente">
            Paciente *
          </label>
          <select
            id="presc-paciente"
            className="campo__control"
            {...register('paciente')}
          >
            <option value="">Selecciona un paciente…</option>
            {pacientes.map((paciente) => (
              <option key={paciente.id} value={paciente.id}>
                {paciente.nombreCompleto} · {paciente.identificador}
              </option>
            ))}
          </select>
          {errors.paciente && (
            <span className="campo__error">{errors.paciente.message}</span>
          )}
        </div>
        <div className="campo">
          <label className="campo__label" htmlFor="presc-medicamento">
            Medicamento *
          </label>
          <select
            id="presc-medicamento"
            className="campo__control"
            {...register('medicamentoId')}
          >
            <option value="">Selecciona del catálogo…</option>
            {catalogo.map((item) => (
              <option key={item.id} value={item.id} disabled={item.stock === 0}>
                {item.nombre} · stock {item.stock} {item.unidad}
              </option>
            ))}
          </select>
          {errors.medicamentoId && (
            <span className="campo__error">{errors.medicamentoId.message}</span>
          )}
        </div>
      </div>

      <div className="campo-fila campo-fila--3">
        <Input
          etiqueta="Dosis *"
          placeholder="Ej. 5 mg/kg IV lento"
          error={errors.dosis?.message}
          {...register('dosis')}
        />
        <Input
          etiqueta="Unidades por dosis *"
          type="number"
          min={1}
          step={1}
          error={errors.unidadesPorDosis?.message}
          {...register('unidadesPorDosis')}
        />
        <div className="campo">
          <label className="campo__label" htmlFor="presc-via">
            Vía *
          </label>
          <select
            id="presc-via"
            className="campo__control"
            {...register('via')}
          >
            {(Object.keys(ETIQUETA_VIA) as ViaAdministracion[]).map((via) => (
              <option key={via} value={via}>
                {via} · {ETIQUETA_VIA[via]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="campo-fila campo-fila--3">
        <Input
          etiqueta="Primera dosis *"
          type="datetime-local"
          error={errors.inicio?.message}
          {...register('inicio')}
        />
        <Input
          etiqueta="Repetir cada (horas)"
          type="number"
          min={1}
          max={168}
          step={1}
          placeholder="Vacío = dosis única"
          error={errors.frecuenciaHoras?.message}
          {...register('frecuenciaHoras')}
        />
        <Input
          etiqueta="Término"
          type="datetime-local"
          disabled={!recurrente}
          ayuda={
            recurrente
              ? 'Vacío = hasta suspenderla'
              : 'Solo para indicaciones recurrentes'
          }
          error={errors.fin?.message}
          {...register('fin')}
        />
      </div>

      <div className="formulario-medicamento__pie">
        <Button variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={guardando}>
          Prescribir
        </Button>
      </div>
    </form>
  );
}
