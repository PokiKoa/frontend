/**
 * @file planSchema.ts
 * @description Validación de planes de cuidado neonatal.
 */

import { z } from 'zod';

/** Esquema del formulario de plan. */
export const planSchema = z.object({
  paciente: z.preprocess(
    (valor) => {
      if (valor === '' || valor === null || valor === undefined)
        return undefined;
      return Number(valor);
    },
    z
      .number({ message: 'Selecciona un paciente.' })
      .int()
      .positive('Selecciona un paciente.')
  ),
  areaCuidado: z
    .string()
    .trim()
    .min(2, 'El área de cuidado es obligatoria.')
    .max(100, 'Máximo 100 caracteres.'),
  intervencion: z
    .string()
    .trim()
    .min(3, 'Describe la intervención.')
    .max(500, 'Máximo 500 caracteres.'),
  frecuencia: z
    .string()
    .trim()
    .min(2, 'Indica la frecuencia.')
    .max(100, 'Máximo 100 caracteres.'),
  estado: z.enum(['Activo', 'Suspendido', 'Finalizado']),
});

/** Datos del formulario de plan. */
export type PlanFormData = z.infer<typeof planSchema>;
