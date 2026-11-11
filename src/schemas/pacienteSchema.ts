/**
 * @file pacienteSchema.ts
 * @description Validación del formulario de paciente. Replica los límites del
 * backend (PatientCreateSerializer) para avisar antes de enviar; el backend
 * sigue validando y sus errores se muestran igual.
 */

import { z } from 'zod';

import { rutValido, telefonoValido } from '@/utils/contacto';
import { fechaHoy } from '@/utils/fechas';

function numero(mensaje: string) {
  return z.preprocess(
    (valor) =>
      valor === '' || valor === null || valor === undefined
        ? undefined
        : Number(valor),
    z.number({ message: mensaje })
  );
}

const pesoOpcional = z.preprocess(
  (valor) =>
    valor === '' || valor === null || valor === undefined
      ? undefined
      : Number(valor),
  z
    .number()
    .int('El peso se registra en gramos enteros.')
    .min(200, 'El peso mínimo admitido es 200 g.')
    .max(10000, 'El peso máximo admitido es 10.000 g.')
    .optional()
);

/** Madre o padre: todos los campos son opcionales, pero si se escriben deben ser válidos. */
const tutorSchema = z.object({
  rut: z
    .string()
    .trim()
    .refine(
      rutValido,
      'RUT inválido: revisa el dígito verificador (ej. 12.345.678-5).'
    ),
  nombres: z.string().trim().max(100, 'Máximo 100 caracteres.'),
  apellidos: z.string().trim().max(100, 'Máximo 100 caracteres.'),
  telefono: z
    .string()
    .trim()
    .refine(
      telefonoValido,
      'Teléfono chileno de 9 dígitos (ej. +56 9 1234 5678).'
    ),
});

export const pacienteSchema = z.object({
  identificador: z
    .string()
    .trim()
    .min(3, 'La ficha clínica debe tener al menos 3 caracteres.')
    .max(30, 'La ficha clínica admite hasta 30 caracteres.'),
  nombreCompleto: z
    .string()
    .trim()
    .min(3, 'El nombre completo es obligatorio.')
    .max(200, 'El nombre admite hasta 200 caracteres.'),
  sexo: z.enum(['F', 'M'], { message: 'Selecciona el sexo.' }),
  fechaNacimiento: z
    .string()
    .min(1, 'La fecha de nacimiento es obligatoria.')
    .refine(
      (valor) => valor <= fechaHoy(),
      'La fecha de nacimiento no puede ser futura.'
    ),
  edadGestacional: numero('Ingresa la edad gestacional en semanas.').pipe(
    z.number().min(20, 'Mínimo 20 semanas.').max(45, 'Máximo 45 semanas.')
  ),
  pesoNacimiento: numero('Ingresa el peso de nacimiento en gramos.').pipe(
    z
      .number()
      .int('El peso se registra en gramos enteros.')
      .min(200, 'El peso mínimo admitido es 200 g.')
      .max(8000, 'El peso máximo admitido es 8.000 g.')
  ),
  peso: pesoOpcional,
  diagnostico: z.string().trim().max(2000).optional(),
  medicoId: z.preprocess(
    (valor) =>
      valor === '' || valor === null || valor === undefined
        ? undefined
        : Number(valor),
    z.number().int().positive().optional()
  ),
  cunaId: z.preprocess(
    (valor) =>
      valor === '' || valor === null || valor === undefined
        ? undefined
        : Number(valor),
    z.number().int().positive().optional()
  ),
  madre: tutorSchema,
  padre: tutorSchema,
});

export type PacienteFormData = z.infer<typeof pacienteSchema>;
