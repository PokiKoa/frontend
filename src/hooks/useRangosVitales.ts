/**
 * @file useRangosVitales.ts
 * @description Rangos normales para colorear signos vitales, desde los umbrales
 * globales del backend.
 */

import { useEffect, useState } from 'react';

import { obtenerUmbralesPorDefecto } from '@/services/umbralesService';
import { rangosDesdeUmbrales, type RangosVitales } from '@/utils/rangos';

export function useRangosVitales(): RangosVitales | null {
  const [rangos, setRangos] = useState<RangosVitales | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerUmbralesPorDefecto()
      .then((umbrales) => {
        if (vigente) setRangos(rangosDesdeUmbrales(umbrales));
      })
      .catch(() => {
        // Sin umbrales los signos se muestran sin color de alerta
      });
    return () => {
      vigente = false;
    };
  }, []);

  return rangos;
}
