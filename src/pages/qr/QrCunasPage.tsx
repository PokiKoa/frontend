/**
 * @file QrCunasPage.tsx
 * @description Hoja imprimible con el QR de cada cuna (`/cunas/qr`). Cada
 * etiqueta se pega en la cuna y sirve todos los días: el QR apunta a la cuna,
 * y al escanearlo se abre la ficha del paciente que la ocupe en ese momento.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';

import { obtenerMensajeError } from '@/api/axios';
import Button from '@/components/ui/Button/Button';
import EstadoVacio from '@/components/ui/EstadoVacio/EstadoVacio';
import Icono from '@/components/ui/Iconos/Iconos';
import Input from '@/components/ui/Input/Input';
import Spinner from '@/components/ui/Spinner/Spinner';
import { cunasService } from '@/services/cunasService';
import type { Cuna } from '@/types/cuna';
import { origenPublico, urlQrCuna } from '@/utils/qr';

import './QrCunas.css';

/** Un origen local no se abre desde un teléfono: hay que avisar antes de imprimir. */
function esOrigenLocal(origen: string): boolean {
  try {
    const { hostname } = new URL(origen);
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  } catch {
    return true;
  }
}

export default function QrCunasPage() {
  const [cunas, setCunas] = useState<Cuna[]>([]);
  const [imagenes, setImagenes] = useState<Record<string, string>>({});
  const [origen, setOrigen] = useState(origenPublico);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    cunasService
      .listar()
      .then((lista) => {
        if (vigente) setCunas(lista);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(obtenerMensajeError(fallo));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const origenValido = useMemo(() => {
    try {
      return Boolean(new URL(origen).host);
    } catch {
      return false;
    }
  }, [origen]);

  useEffect(() => {
    if (!origenValido) return;
    let vigente = true;
    Promise.all(
      cunas.map(async (cuna) => {
        const imagen = await QRCode.toDataURL(
          urlQrCuna(cuna.identificador, origen),
          { errorCorrectionLevel: 'M', margin: 1, width: 480 }
        );
        return [cuna.identificador, imagen] as const;
      })
    )
      .then((pares) => {
        if (vigente) setImagenes(Object.fromEntries(pares));
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(obtenerMensajeError(fallo));
      });
    return () => {
      vigente = false;
    };
  }, [cunas, origen, origenValido]);

  if (cargando) return <Spinner bloque texto="Cargando cunas…" />;

  return (
    <div className="pagina qr-hoja">
      <header className="pagina__cabecera qr-hoja__no-imprimir">
        <div>
          <Link to="/mapa" className="pagina__volver">
            <Icono nombre="volver" tamano={14} />
            Volver al mapa
          </Link>
          <h2 className="pagina__titulo">Códigos QR de cunas</h2>
          <p className="pagina__descripcion">
            Imprime y pega cada etiqueta en su cuna. Al escanearla se abre la
            ficha del paciente que ocupe la cuna en ese momento, sin importar
            cuántos pacientes pasen por ella.
          </p>
        </div>
        <div className="pagina__acciones">
          <Button
            icono={<Icono nombre="descargar" tamano={15} />}
            onClick={() => window.print()}
            disabled={!origenValido || cunas.length === 0}
          >
            Imprimir etiquetas
          </Button>
        </div>
      </header>

      <section className="tarjeta qr-hoja__no-imprimir">
        <div className="tarjeta__cuerpo qr-hoja__origen">
          <Input
            etiqueta="Dirección de la app que se imprime en los QR"
            value={origen}
            onChange={(evento) => setOrigen(evento.target.value.trim())}
            error={
              origenValido
                ? undefined
                : 'Ingresa una URL completa, con https://'
            }
          />
          {origenValido && esOrigenLocal(origen) && (
            <p className="mensaje mensaje--aviso">
              Esta dirección solo funciona en este computador. Para que los
              teléfonos y tablets abran los QR, usa la dirección pública de la
              app (o la IP de red, ej. http://192.168.1.20:5173) o define{' '}
              <code>VITE_PUBLIC_URL</code>.
            </p>
          )}
          <p className="texto-muted texto-pequeno">
            Si cambias el código de una cuna, vuelve a imprimir su etiqueta.
          </p>
        </div>
      </section>

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {cunas.length === 0 ? (
        <EstadoVacio
          titulo="No hay cunas registradas"
          icono={<Icono nombre="cunas" tamano={28} />}
        />
      ) : (
        <div className="qr-hoja__rejilla">
          {cunas.map((cuna) => (
            <article key={cuna.id} className="qr-etiqueta">
              {imagenes[cuna.identificador] ? (
                <img
                  className="qr-etiqueta__codigo"
                  src={imagenes[cuna.identificador]}
                  alt={`Código QR de la cuna ${cuna.identificador}`}
                />
              ) : (
                <div className="qr-etiqueta__codigo qr-etiqueta__codigo--vacio" />
              )}
              <p className="qr-etiqueta__cuna">{cuna.identificador}</p>
              <p className="qr-etiqueta__detalle">
                {[cuna.nombre, cuna.ubicacion].filter(Boolean).join(' · ') ||
                  'Unidad neonatal'}
              </p>
              <p className="qr-etiqueta__ayuda">
                Escanea para abrir la ficha · Poki Koa
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
