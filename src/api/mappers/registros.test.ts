import { describe, expect, it } from 'vitest';

import { mapRegistro, registrosACsv } from './registros';

describe('mapper de auditoría', () => {
  it('describe el evento solo con nombres de campos', () => {
    const registro = mapRegistro({
      id: 1,
      actor_user: 2,
      actor_email: 'neo@pokikoa.cl',
      actor_name: 'Dr. Soto',
      actor_device_code: '',
      patient_id: 7,
      action: 'update',
      resource_type: 'patient',
      resource_id: '7',
      changed_fields: ['diagnosis', 'current_weight_g'],
      ip_address: '127.0.0.1',
      timestamp: '2026-11-03T10:00:00-03:00',
    });
    expect(registro.accion).toBe('actualizar');
    expect(registro.entidad).toBe('Paciente');
    expect(registro.camposModificados).toEqual([
      'diagnosis',
      'current_weight_g',
    ]);
    expect(registro.descripcion).toBe(
      'Actualización · Paciente #7 (diagnosis, current_weight_g)'
    );
  });

  it('atribuye eventos sin usuario al dispositivo o al sistema', () => {
    const base = {
      id: 2,
      actor_user: null,
      actor_email: '',
      actor_name: '',
      patient_id: null,
      action: 'ingest_telemetry' as const,
      resource_type: 'crib',
      resource_id: '1',
      changed_fields: null,
      ip_address: null,
      timestamp: '',
    };
    expect(
      mapRegistro({ ...base, actor_device_code: 'C-01' }).usuarioNombre
    ).toBe('C-01');
    expect(mapRegistro({ ...base, actor_device_code: '' }).usuarioNombre).toBe(
      'Sistema'
    );
    expect(
      mapRegistro({ ...base, actor_device_code: '' }).camposModificados
    ).toEqual([]);
  });
});

describe('registrosACsv', () => {
  const registro = mapRegistro({
    id: 1,
    actor_user: 2,
    actor_email: 'neo@pokikoa.cl',
    actor_name: 'Dr. Soto',
    actor_device_code: '',
    patient_id: 7,
    action: 'update',
    resource_type: 'patient',
    resource_id: '7',
    changed_fields: ['diagnosis', 'current_weight_g'],
    ip_address: null,
    timestamp: '2026-11-03T10:00:00-03:00',
  });

  it('exporta encabezado y una fila por registro con el exportador compartido', () => {
    const lineas = registrosACsv([registro]).split('\r\n');
    expect(lineas[0]).toBe(
      'Fecha;Responsable;Acción;Entidad;ID entidad;Descripción;Campos modificados;IP'
    );
    expect(lineas[1]).toBe(
      '2026-11-03T10:00:00-03:00;Dr. Soto;Actualización;Paciente;7;' +
        'Actualización · Paciente #7 (diagnosis, current_weight_g);' +
        'diagnosis, current_weight_g;'
    );
  });

  it('exporta solo el encabezado si no hay registros', () => {
    expect(registrosACsv([]).split('\r\n')).toHaveLength(1);
  });
});
