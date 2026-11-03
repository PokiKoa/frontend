import { describe, expect, it } from 'vitest';

import {
  mapObservacion,
  mapPlan,
  mapPlanCreacion,
  mapPlanEdicion,
} from './planes';

describe('mapper de planes', () => {
  const payload = {
    paciente: 4,
    areaCuidado: ' Termorregulación ',
    intervencion: 'Control de temperatura',
    frecuencia: 'Cada 3 horas',
    estado: 'Suspendido' as const,
  };

  it('traduce estado y campos del plan', () => {
    const plan = mapPlan({
      id: 1,
      patient: 4,
      patient_name: 'RN',
      care_area: 'Termorregulación',
      intervention: 'x',
      frequency: 'y',
      status: 'completed',
      created_by: 2,
      created_by_name: 'Matrona',
      created_at: '',
      updated_at: '',
    });
    expect(plan.estado).toBe('Finalizado');
    expect(plan.cuna).toBe('Sin cuna');
  });

  it('la creación incluye al paciente y la edición no', () => {
    expect(mapPlanCreacion(payload)).toMatchObject({
      patient_id: 4,
      care_area: 'Termorregulación',
      status: 'suspended',
    });
    expect(mapPlanEdicion(payload)).not.toHaveProperty('patient_id');
  });

  it('traduce la categoría de observación', () => {
    expect(
      mapObservacion({
        id: 1,
        patient: 4,
        patient_name: 'RN',
        author: 2,
        author_name: 'A',
        category: 'kangaroo_care',
        content: 'c',
        created_at: '',
      }).categoria
    ).toBe('canguro');
  });
});
