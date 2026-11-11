import { describe, expect, it } from 'vitest';

import type { Rol, Usuario } from '@/types/auth';

import {
  ACCESO_PANTALLAS,
  esMedico,
  puedeAdministrarDosis,
  puedeAdmitirPaciente,
  puedeGestionarCatalogo,
  puedeVer,
  rutaInicio,
} from './roles';

function usuario(rol: Rol): Usuario {
  return {
    id: 1,
    username: 'u',
    email: '',
    nombreCompleto: 'U',
    iniciales: 'U',
    rol,
    turno: null,
    activo: true,
    dobleFactorActivo: false,
    bloqueado: false,
    ultimoAcceso: null,
    creadoEn: '',
  };
}

describe('permisos por rol', () => {
  it('farmacia solo ve farmacia, reportes y configuración', () => {
    const qf = usuario('farmacia');
    const visibles = Object.keys(ACCESO_PANTALLAS).filter((p) =>
      puedeVer(qf, p as keyof typeof ACCESO_PANTALLAS)
    );
    expect(visibles.sort()).toEqual([
      'configuracion',
      'medicamentos',
      'reportes',
    ]);
    expect(rutaInicio(qf)).toBe('/medicamentos');
  });

  it('la auditoría es exclusiva del administrador', () => {
    expect(puedeVer(usuario('administrador'), 'registros')).toBe(true);
    for (const rol of ['medico', 'enfermeria', 'farmacia'] as Rol[]) {
      expect(puedeVer(usuario(rol), 'registros')).toBe(false);
    }
  });

  it('acciones clínicas siguen la matriz RBAC del backend', () => {
    expect(esMedico(usuario('medico'))).toBe(true);
    expect(esMedico(usuario('enfermeria'))).toBe(false);
    expect(puedeAdministrarDosis(usuario('enfermeria'))).toBe(true);
    expect(puedeAdministrarDosis(usuario('administrador'))).toBe(false);
    expect(puedeAdmitirPaciente(usuario('medico'))).toBe(true);
    expect(puedeAdmitirPaciente(usuario('enfermeria'))).toBe(true);
    expect(puedeAdmitirPaciente(usuario('administrador'))).toBe(false);
    expect(puedeGestionarCatalogo(usuario('farmacia'))).toBe(true);
    expect(puedeGestionarCatalogo(usuario('medico'))).toBe(false);
    expect(puedeVer(null, 'panel')).toBe(false);
  });
});
