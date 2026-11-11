import { describe, expect, it } from 'vitest';

import type { Notificacion } from '@/types/alerta';

import { clavesAlLimpiar, notificacionesVisibles } from './notificaciones';

const notificacion = (clave: string): Notificacion => ({
  id: `alerta-${clave}`,
  clave,
  titulo: 'Alerta crítica',
  detalle: 'SpO2 baja · Cuna C-01',
  fechaHora: '2026-11-03T10:00:00-03:00',
  critica: true,
  leida: false,
  ruta: '/alertas?alerta=1',
});

describe('notificaciones limpiadas', () => {
  it('oculta las limpiadas y muestra las nuevas', () => {
    const limpiadas = clavesAlLimpiar([notificacion('1:Advertencia')]);
    const visibles = notificacionesVisibles(
      [notificacion('1:Advertencia'), notificacion('2:Critica')],
      limpiadas
    );
    expect(visibles.map((n) => n.clave)).toEqual(['2:Critica']);
  });

  it('vuelve a mostrar una alerta limpiada si sube de severidad', () => {
    const limpiadas = clavesAlLimpiar([notificacion('1:Advertencia')]);
    expect(
      notificacionesVisibles([notificacion('1:Critica')], limpiadas)
    ).toHaveLength(1);
  });
});
