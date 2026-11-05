/**
 * @file QrCunaPage.tsx
 * @description Destino de los QR pegados en las cunas (`/qr/cuna/:codigo`).
 * Busca la cuna por su código y abre la ficha de quien la ocupa; si está
 * libre, muestra su estado. Si no hay sesión, el login vuelve aquí.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { obtenerMensajeError } from '@/api/axios';
import { ETIQUETA_ESTADO_CUNA } from '@/api/mappers/cunas';
import EstadoVacio from '@/components/ui/EstadoVacio/EstadoVacio';
import Icono from '@/components/ui/Iconos/Iconos';
import Spinner from '@/components/ui/Spinner/Spinner';
import { cunasService } from '@/services/cunasService';
import type { CunaQr, EstadoNavegacionQr } from '@/types/cuna';

export default function QrCunaPage() {
  const { codigo = '' } = useParams<{ codigo: string }>();
  const navegar = useNavigate();
  const [cuna, setCuna] = useState<CunaQr | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    cunasService
      .buscarPorCodigo(codigo)
      .then((encontrada) => {
        if (!vigente) return;
        if (encontrada?.pacienteId) {
          const estado: EstadoNavegacionQr = {
            desdeQrCuna: encontrada.identificador,
          };
          navegar(`/pacientes/${encontrada.pacienteId}`, {
            replace: true,
            state: estado,
          });
          return;
        }
        setCuna(encontrada);
        setCargando(false);
      })
      .catch((fallo: unknown) => {
        if (!vigente) return;
        setError(obtenerMensajeError(fallo));
        setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [codigo, navegar]);

  if (cargando) {
    return <Spinner bloque texto={`Buscando la cuna ${codigo}…`} />;
  }

  const irAlMapa = (
    <Link to="/mapa" className="boton boton--primario boton--md">
      Ir al mapa de cunas
    </Link>
  );

  if (error) {
    return (
      <EstadoVacio
        titulo="No se pudo abrir la cuna"
        texto={error}
        icono={<Icono nombre="qr" tamano={28} />}
        accion={irAlMapa}
      />
    );
  }

  if (!cuna) {
    return (
      <EstadoVacio
        titulo={`No existe una cuna con el código ${codigo}`}
        texto="El QR puede ser de una cuna renombrada o eliminada. Imprime de nuevo su código desde el mapa de cunas."
        icono={<Icono nombre="qr" tamano={28} />}
        accion={irAlMapa}
      />
    );
  }

  return (
    <EstadoVacio
      titulo={`Cuna ${cuna.identificador} · ${ETIQUETA_ESTADO_CUNA[cuna.estado]}`}
      texto={`${[cuna.nombre, cuna.ubicacion].filter(Boolean).join(' · ') || 'Sin ubicación registrada'}. No tiene un paciente asignado; puedes asignarle uno desde el mapa.`}
      icono={<Icono nombre="cunas" tamano={28} />}
      accion={irAlMapa}
    />
  );
}
