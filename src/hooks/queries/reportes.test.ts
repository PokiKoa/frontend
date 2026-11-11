import { beforeEach, describe, expect, it, vi } from 'vitest';

import { crearQueryClient } from '@/api/queryClient';
import { reportesService } from '@/services/reportesService';
import type { SerieActividad } from '@/types/reporte';

import { reportesKeys, serieQueryOptions } from './reportes';

vi.mock('@/services/reportesService', () => ({
  reportesService: { reporte: vi.fn(), serie: vi.fn() },
}));

describe('consultas de reportes', () => {
  beforeEach(() => {
    vi.mocked(reportesService.serie).mockReset();
  });

  it('separa la caché de la serie por periodo bajo el prefijo reportes', () => {
    expect(reportesKeys.serie(7)).not.toEqual(reportesKeys.serie(14));
    expect(reportesKeys.serie(7)[0]).toBe(reportesKeys.all[0]);
  });

  it('consulta la serie del periodo indicado', async () => {
    const serie = { dias: 7, serie: [] } as unknown as SerieActividad;
    vi.mocked(reportesService.serie).mockResolvedValue(serie);

    const datos = await crearQueryClient().fetchQuery(serieQueryOptions(7));

    expect(reportesService.serie).toHaveBeenCalledWith(7);
    expect(datos).toBe(serie);
  });
});
