/**
 * @file EscanerQr.tsx
 * @description Lector de QR de cunas con la cámara del dispositivo. Usa el
 * `BarcodeDetector` nativo cuando existe (Chrome/Android) y, si no, decodifica
 * los cuadros del video con jsQR (Safari/iOS), que se carga solo al abrir.
 * Solo acepta QR de cunas de Poki Koa: nunca abre enlaces externos.
 */

import { useEffect, useRef, useState } from 'react';

import Button from '@/components/ui/Button/Button';
import Modal from '@/components/ui/Modal/Modal';
import { codigoDesdeQr } from '@/utils/qr';

import './EscanerQr.css';

/** Propiedades del componente `EscanerQr`. */
interface Props {
  /** Controla la apertura del modal y activa o detiene el flujo de cámara (`MediaStream`). */
  abierto: boolean;
  /** Callback invocado para cerrar el modal y liberar los recursos de video. */
  onCerrar: () => void;
  /** Callback invocado una única vez al detectar un QR válido perteneciente a una cuna de Poki Koa. */
  onDetectado: (codigoCuna: string) => void;
}

/** Subconjunto del `BarcodeDetector` nativo (aún no está en los tipos de TS). */
interface DetectorNativo {
  detect: (fuente: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}

/** Constructor tipado de la API experimental `BarcodeDetector` del navegador. */
type ConstructorDetector = new (opciones: {
  formats: string[];
}) => DetectorNativo;

/** Función asíncrona que extrae el texto crudo de un QR desde un elemento `<video>`. */
type Lector = (video: HTMLVideoElement) => Promise<string | null>;

/** Intervalo en milisegundos entre análisis consecutivos de cuadros de video. */
const INTERVALO_MS = 250;

/**
 * Inicializa la estrategia de decodificación QR más eficiente disponible en el navegador.
 * Prioriza `BarcodeDetector` nativo y recurre dinámicamente a `jsQR` sobre un `<canvas>`
 * fuera de pantalla cuando la API nativa no está soportada.
 *
 * @returns Función `Lector` lista para analizar fotogramas de un `HTMLVideoElement`.
 */
async function crearLector(): Promise<Lector> {
  const Nativo = (
    window as unknown as { BarcodeDetector?: ConstructorDetector }
  ).BarcodeDetector;
  if (Nativo) {
    const detector = new Nativo({ formats: ['qr_code'] });
    return async (video) => {
      const [resultado] = await detector.detect(video);
      return resultado?.rawValue ?? null;
    };
  }

  const { default: jsQR } = await import('jsqr');
  const lienzo = document.createElement('canvas');
  const contexto = lienzo.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    if (!contexto || !video.videoWidth) return null;
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);
    const imagen = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
    return jsQR(imagen.data, imagen.width, imagen.height)?.data ?? null;
  };
}

/**
 * Traduce excepciones `DOMException` de `navigator.mediaDevices.getUserMedia`
 * a mensajes accionables en español para el usuario clínico.
 *
 * @param fallo - Excepción capturada al intentar abrir el flujo de video.
 * @returns Mensaje descriptivo del motivo por el cual no se pudo iniciar la cámara.
 */
function mensajeErrorCamara(fallo: unknown): string {
  const nombre = fallo instanceof DOMException ? fallo.name : '';
  if (nombre === 'NotAllowedError') {
    return 'No hay permiso para usar la cámara. Habilítalo en la configuración del navegador.';
  }
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
    return 'No se encontró una cámara en este dispositivo.';
  }
  if (nombre === 'NotReadableError') {
    return 'La cámara está siendo usada por otra aplicación.';
  }
  return 'No se pudo iniciar la cámara.';
}

/**
 * Renderiza un modal con vista previa de la cámara trasera para escanear códigos QR de cunas.
 * Verifica contexto seguro (HTTPS), filtra exclusivamente códigos reconocidos por `codigoDesdeQr`
 * para evitar redirecciones externas y detiene todas las pistas de video al desmontar o cerrar.
 *
 * @param props - Propiedades del componente (`{ abierto, onCerrar, onDetectado }`).
 * @returns Elemento `Modal` con el visor `<video>`, guía visual de encuadre y mensajes de estado/error.
 */
export default function EscanerQr({ abierto, onCerrar, onDetectado }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    let activo = true;
    let flujo: MediaStream | null = null;
    let temporizador: number | undefined;
    setError('');
    setAviso('');

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'El navegador solo permite usar la cámara en conexiones seguras (HTTPS). Mientras tanto, escanea el QR con la app de cámara del teléfono: abre la ficha igual.'
      );
      return;
    }

    const iniciar = async () => {
      setIniciando(true);
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!activo || !video.current) return;
        video.current.srcObject = flujo;
        await video.current.play();
        const leer = await crearLector();

        const revisar = async () => {
          if (!activo || !video.current) return;
          try {
            const texto = await leer(video.current);
            if (texto) {
              const codigo = codigoDesdeQr(texto);
              if (codigo) {
                activo = false;
                onDetectado(codigo);
                return;
              }
              setAviso('Ese QR no corresponde a una cuna de Poki Koa.');
            }
          } catch {
            // Un cuadro ilegible no detiene la lectura; se intenta con el siguiente
          }
          temporizador = window.setTimeout(() => void revisar(), INTERVALO_MS);
        };
        void revisar();
      } catch (fallo) {
        if (activo) setError(mensajeErrorCamara(fallo));
      } finally {
        if (activo) setIniciando(false);
      }
    };
    void iniciar();

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
      flujo?.getTracks().forEach((pista) => pista.stop());
    };
  }, [abierto, onDetectado]);

  return (
    <Modal
      abierto={abierto}
      titulo="Escanear QR de cuna"
      descripcion="Apunta la cámara al código pegado en la cuna para abrir la ficha del paciente."
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <Button variante="secundario" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      {error ? (
        <div className="mensaje mensaje--aviso" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      ) : (
        <div className="escaner-qr">
          <video
            ref={video}
            className="escaner-qr__video"
            muted
            playsInline
            aria-label="Vista de la cámara"
          />
          <div className="escaner-qr__marco" aria-hidden="true" />
          {iniciando && <p className="escaner-qr__estado">Iniciando cámara…</p>}
        </div>
      )}
      {aviso && !error && (
        <p className="texto-muted texto-pequeno escaner-qr__aviso">{aviso}</p>
      )}
    </Modal>
  );
}
