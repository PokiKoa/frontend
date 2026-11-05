import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { crearQueryClient } from '@/api/queryClient';
import { pacientesService } from '@/services/pacientesService';
import type { Paciente } from '@/types/paciente';

import { cunasKeys } from './cunas';
import {
  invalidarPacientes,
  pacienteQueryOptions,
  pacientesKeys,
  pacientesQueryOptions,
} from './pacientes';
import { reportesKeys } from './reportes';

vi.mock('@/services/pacientesService', () => ({
  pacientesService: { listar: vi.fn(), obtener: vi.fn() },
}));

const paciente = { id: 7, nombreCompleto: 'RN Mateo' } as Paciente;

describe('claves de caché de pacientes', () => {
  it('cambian al cambiar los filtros o el tamaño de página', () => {
    const base = pacientesKeys.lista({ search: 'a', pagina: 1 }, 8);
    expect(pacientesKeys.lista({ search: 'a', pagina: 2 }, 8)).not.toEqual(
      base
    );
    expect(pacientesKeys.lista({ search: 'a', pagina: 1 }, 20)).not.toEqual(
      base
    );
    expect(pacientesKeys.lista({ search: 'a', pagina: 1 }, 8)).toEqual(base);
  });

  it('comparten el prefijo para invalidar por grupo', () => {
    expect(pacientesKeys.lista({}, 8)[0]).toBe(pacientesKeys.all[0]);
    expect(pacientesKeys.detalle(3)[0]).toBe(pacientesKeys.all[0]);
  });
});

describe('consultas de pacientes', () => {
  let cliente: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    cliente = crearQueryClient();
  });

  it('el listado reutiliza pacientesService.listar con filtros y tamaño', async () => {
    vi.mocked(pacientesService.listar).mockResolvedValue({
      total: 1,
      pacientes: [paciente],
    });
    const filtros = { activo: true, pagina: 2 };

    const resultado = await cliente.fetchQuery(
      pacientesQueryOptions(filtros, 8)
    );

    expect(pacientesService.listar).toHaveBeenCalledWith(filtros, 8);
    expect(resultado.total).toBe(1);
  });

  it('no repite la petición mientras el dato sigue fresco', async () => {
    vi.mocked(pacientesService.obtener).mockResolvedValue(paciente);

    await cliente.fetchQuery(pacienteQueryOptions(7));
    await cliente.fetchQuery(pacienteQueryOptions(7));

    expect(pacientesService.obtener).toHaveBeenCalledTimes(1);
  });

  it('comparte una sola petición entre consultas simultáneas iguales', async () => {
    vi.mocked(pacientesService.obtener).mockResolvedValue(paciente);

    await Promise.all([
      cliente.fetchQuery(pacienteQueryOptions(7)),
      cliente.fetchQuery(pacienteQueryOptions(7)),
    ]);

    expect(pacientesService.obtener).toHaveBeenCalledTimes(1);
  });
});

describe('invalidarPacientes', () => {
  it('marca como desactualizados pacientes, reportes y cunas', async () => {
    const cliente = crearQueryClient();
    cliente.setQueryData(pacientesKeys.lista({}, 8), {
      total: 0,
      pacientes: [],
    });
    cliente.setQueryData(pacientesKeys.detalle(7), paciente);
    cliente.setQueryData(reportesKeys.resumen(), {});
    cliente.setQueryData(cunasKeys.lista(), []);
    cliente.setQueryData(['otro'], 1);

    await invalidarPacientes(cliente);

    const obsoleta = (clave: readonly unknown[]) =>
      cliente.getQueryState(clave)?.isInvalidated;
    expect(obsoleta(pacientesKeys.lista({}, 8))).toBe(true);
    expect(obsoleta(pacientesKeys.detalle(7))).toBe(true);
    expect(obsoleta(reportesKeys.resumen())).toBe(true);
    expect(obsoleta(cunasKeys.lista())).toBe(true);
    expect(obsoleta(['otro'])).toBe(false);
  });
});
