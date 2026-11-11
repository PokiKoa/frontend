/**
 * @file estados.test.ts
 * @description Reglas de estado compartidas de planes de cuidado e indicaciones.
 */

import { describe, expect, it } from 'vitest';

import type { Medicamento } from '@/types/medicamento';
import type { PlanCuidado } from '@/types/plan';

import {
  contarIndicacionesVigentes,
  contarPlanesActivos,
  esIndicacionVigente,
  esPlanActivo,
} from './estados';

const plan = (estado: PlanCuidado['estado']) => ({ estado }) as PlanCuidado;
const indicacion = (estado: Medicamento['estado']) =>
  ({ estado }) as Medicamento;

describe('planes de cuidado', () => {
  it('solo el estado Activo cuenta como plan activo', () => {
    expect(esPlanActivo(plan('Activo'))).toBe(true);
    expect(esPlanActivo(plan('Finalizado'))).toBe(false);
  });

  it('cuenta planes activos y devuelve 0 sin planes', () => {
    expect(contarPlanesActivos([])).toBe(0);
    expect(
      contarPlanesActivos([plan('Activo'), plan('Suspendido'), plan('Activo')])
    ).toBe(2);
  });
});

describe('indicaciones', () => {
  it('solo el estado Vigente cuenta como indicación vigente', () => {
    expect(esIndicacionVigente(indicacion('Vigente'))).toBe(true);
    expect(esIndicacionVigente(indicacion('Cancelada'))).toBe(false);
  });

  it('cuenta indicaciones vigentes', () => {
    expect(contarIndicacionesVigentes([])).toBe(0);
    expect(
      contarIndicacionesVigentes([
        indicacion('Vigente'),
        indicacion('Completada'),
      ])
    ).toBe(1);
  });
});
