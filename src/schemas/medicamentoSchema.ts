/**
 * @file medicamentoSchema.ts
 * @description Validación de los formularios de catálogo e indicaciones médicas.
 */

import { z } from 'zod';

const aNumero = (valor: unknown) =>
  valor === '' || valor === null || valor === undefined
    ? undefined
    : Number(valor);

const entero = (mensaje: string, minimo: number) =>
  z.preprocess(
    aNumero,
    z
      .number({ message: mensaje })
      .int('Debe ser un número entero.')
      .min(minimo, mensaje)
  );

export const catalogoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre es obligatorio.')
    .max(150, 'Máximo 150 caracteres.'),
  principioActivo: z
    .string()
    .trim()
    .min(2, 'El principio activo es obligatorio.')
    .max(150, 'Máximo 150 caracteres.'),
  dosisMg: z.preprocess(
    aNumero,
    z
      .number({ message: 'Ingresa la concentración.' })
      .min(0.01, 'Debe ser mayor que cero.')
  ),
  unidad: z.string().trim().min(1, 'Indica la unidad de dispensación.').max(30),
  stock: entero('El stock no puede ser negativo.', 0),
  stockMinimo: entero('El umbral no puede ser negativo.', 0),
  activo: z.boolean(),
});

export type CatalogoFormData = z.infer<typeof catalogoSchema>;

export const prescripcionSchema = z
  .object({
    paciente: z.preprocess(
      aNumero,
      z.number({ message: 'Selecciona un paciente.' }).int().positive()
    ),
    medicamentoId: z.preprocess(
      aNumero,
      z
        .number({ message: 'Selecciona un medicamento del catálogo.' })
        .int()
        .positive()
    ),
    dosis: z
      .string()
      .trim()
      .min(1, 'Indica la dosis prescrita.')
      .max(100, 'Máximo 100 caracteres.'),
    unidadesPorDosis: entero('Al menos 1 unidad por dosis.', 1),
    via: z.enum(['IV', 'IM', 'ET', 'PO', 'SC'], {
      message: 'Selecciona la vía.',
    }),
    inicio: z.string().min(1, 'Indica la fecha y hora de la primera dosis.'),
    frecuenciaHoras: z.preprocess(
      aNumero,
      z
        .number()
        .int()
        .min(1, 'Mínimo cada 1 hora.')
        .max(168, 'Máximo cada 168 horas.')
        .optional()
    ),
    fin: z.string().optional(),
  })
  .refine((datos) => !datos.fin || Boolean(datos.frecuenciaHoras), {
    path: ['fin'],
    message: 'Una dosis única no lleva fecha de término.',
  })
  .refine((datos) => !datos.fin || datos.fin > datos.inicio, {
    path: ['fin'],
    message: 'El término debe ser posterior a la primera dosis.',
  });

export type PrescripcionFormData = z.infer<typeof prescripcionSchema>;
