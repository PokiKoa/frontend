/**
 * @file useRangosVitales.ts
 * @description Rangos normales para colorear signos vitales, desde los umbrales
 * globales del backend.
 */

import { useEffect, useState } from 'react';

import { obtenerUmbralesPorDefecto } from '@/services/umbralesService';
import { rangosDesdeUmbrales, type RangosVitales } from '@/utils/rangos';

/**
 * Obtiene y transforma los umbrales globales configurados en el backend en
 * rangos normales de referencia para colorear signos vitales en la interfaz.
 * Si la petición falla o aún no resuelve, devuelve `null` para mostrar los
 * valores sin indicadores de alerta.
 *
 * @returns Estructura `RangosVitales` con los límites normales por parámetro, o `null` mientras carga o en caso de error.
 */
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