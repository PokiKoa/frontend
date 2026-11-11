import { describe, expect, it } from 'vitest';

import {
  mapEgreso,
  mapLectura,
  mapMovimientoCuna,
  mapPaciente,
  mapPacienteCreacion,
  mapPacienteEdicion,
} from './pacientes';

const crudo = {
  id: 7,
  medical_record_number: 'RN-2026-001',
  full_name: 'RN Mateo (Ficticio)',
  sex: 'M' as const,
  birth_date: '2026-10-30',
  age_days: 4,
  gestational_age_weeks: '31.5',
  birth_weight_g: 1480,
  current_weight_g: 1535,
  admitted_at: '2026-10-30T10:00:00-03:00',
  diagnosis: 'Prematuridad',
  mother_rut: '12345678-5',
  mother_first_names: 'Ana',
  mother_last_names: 'Rojas',
  mother_phone: '+56912345678',
  father_rut: '',
  father_first_names: '',
  father_last_names: '',
  father_phone: '',
  attending_physician: 2,
  attending_physician_name: 'Dr. Martín Soto',
  crib: 1,
  crib_code: 'C-01',
  status: 'discharged' as const,
  discharged_at: '2026-11-03T09:00:00-03:00',
  discharge_outcome: 'survived' as const,
  discharge_cause: 'none' as const,
  discharge_notes: '',
  discharged_by: 2,
  created_at: '',
  updated_at: '',
};

const payload = {
  identificador: ' RN-9 ',
  nombreCompleto: ' RN Nueva ',
  sexo: 'F' as const,
  fechaNacimiento: '2026-11-01',
  edadGestacional: 33,
  pesoNacimiento: 1900,
  diagnostico: 'Ictericia',
  medicoId: 2,
};

describe('mapper de pacientes', () => {
  it('traduce el paciente del backend', () => {
    const paciente = mapPaciente(crudo);
    expect(paciente.identificador).toBe('RN-2026-001');
    expect(paciente.edadGestacional).toBe(31.5);
    expect(paciente.estado).toBe('egresado');
    expect(paciente.activo).toBe(false);
    expect(paciente.resultadoAlta).toBe('sobrevivio');
    expect(paciente.causaAlta).toBe('no_aplica');
  });

  it('arma la creación con decimales y valores nulos explícitos', () => {
    expect(mapPacienteCreacion(payload)).toEqual({
      medical_record_number: 'RN-9',
      full_name: 'RN Nueva',
      sex: 'F',
      birth_date: '2026-11-01',
      gestational_age_weeks: '33.0',
      birth_weight_g: 1900,
      current_weight_g: null,
      diagnosis: 'Ictericia',
      attending_physician_id: 2,
      crib_id: null,
    });
  });

  it('solo envía datos médicos en la edición cuando el rol puede cambiarlos', () => {
    expect(
      mapPacienteEdicion(payload, { incluirDatosMedicos: false })
    ).not.toHaveProperty('diagnosis');
    expect(
      mapPacienteEdicion(payload, { incluirDatosMedicos: true })
    ).toMatchObject({
      diagnosis: 'Ictericia',
      attending_physician_id: 2,
    });
  });

  it('traduce el egreso y las lecturas', () => {
    expect(
      mapEgreso({ resultado: 'trasladado', causa: 'sepsis', notas: ' x ' })
    ).toEqual({
      outcome: 'transferred',
      cause: 'sepsis',
      notes: 'x',
    });
    const lectura = mapLectura({
      id: 1,
      crib: 1,
      crib_code: 'C-01',
      patient: 7,
      patient_name: '',
      heart_rate: 140,
      spo2: 97,
      temperature: '36.8',
      sleep_state: 'asleep',
      cannula_connected: true,
      iv_line_active: false,
      recorded_at: '2026-11-03T10:00:00-03:00',
      ingested_at: '',
    });
    expect(lectura.temperatura).toBe(36.8);
    expect(lectura.dormido).toBe(true);
  });

  it('traduce madre y padre en ambos sentidos', () => {
    const paciente = mapPaciente(crudo);
    expect(paciente.madre).toEqual({
      rut: '12345678-5',
      nombres: 'Ana',
      apellidos: 'Rojas',
      telefono: '+56912345678',
    });
    expect(paciente.padre.rut).toBe('');

    const conTutores = {
      ...payload,
      madre: {
        rut: ' 12.345.678-5 ',
        nombres: ' Ana ',
        apellidos: 'Rojas',
        telefono: '912345678',
      },
      padre: { rut: '', nombres: '', apellidos: '', telefono: '' },
    };
    expect(mapPacienteCreacion(conTutores)).toMatchObject({
      mother_rut: '12.345.678-5',
      mother_first_names: 'Ana',
      mother_phone: '912345678',
      father_rut: '',
    });
    // Sin datos de padres en el formulario no se envían (no se borran)
    expect(
      mapPacienteEdicion(payload, { incluirDatosMedicos: false })
    ).not.toHaveProperty('mother_rut');
    expect(
      mapPacienteEdicion(conTutores, { incluirDatosMedicos: false })
    ).toMatchObject({ father_phone: '' });
  });

  it('traduce los movimientos de cuna', () => {
    expect(
      mapMovimientoCuna({
        id: 3,
        patient: 7,
        kind: 'swap',
        kind_label: 'Intercambio de cunas',
        from_crib: 1,
        from_crib_code: 'C-01',
        to_crib: 2,
        to_crib_code: 'C-02',
        moved_by: 2,
        moved_by_name: 'Dr. Martín Soto',
        moved_at: '2026-11-03T10:00:00-03:00',
      })
    ).toEqual({
      id: 3,
      tipo: 'intercambio',
      etiqueta: 'Intercambio de cunas',
      desde: 'C-01',
      hacia: 'C-02',
      registradoPor: 'Dr. Martín Soto',
      fecha: '2026-11-03T10:00:00-03:00',
    });
    expect(
      mapMovimientoCuna({
        id: 4,
        patient: 7,
        kind: 'release',
        kind_label: 'Liberación',
        from_crib: 2,
        from_crib_code: 'C-02',
        to_crib: null,
        to_crib_code: '',
        moved_by: null,
        moved_by_name: '',
        moved_at: '',
      })
    ).toMatchObject({ tipo: 'liberacion', hacia: null, registradoPor: null });
  });
});
