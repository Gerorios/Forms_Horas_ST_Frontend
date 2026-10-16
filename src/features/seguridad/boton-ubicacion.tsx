'use client';

import { useState } from 'react';
import type { OrigenPunto } from '@/lib/api/seguridad';
import { obtenerUbicacion } from './captura-foto';
import type { Centro } from './centro-provincia';
import { MarcarEnMapaDialog } from './marcar-en-mapa-dialog';
import { FOCO_VISIBLE } from './tipos';

/** Punto propio del reporte: tomado con el GPS en el lugar, o marcado a mano
 * en el mapa (sin error en metros). */
export interface PuntoReporte {
  latitud: number;
  longitud: number;
  errorMetros: number | null;
  origen: OrigenPunto;
}

export const urlMapa = (p: { latitud: number; longitud: number }) =>
  `https://www.openstreetmap.org/?mlat=${p.latitud}&mlon=${p.longitud}#map=18/${p.latitud}/${p.longitud}`;

/** Cómo se lee el origen de un punto en el detalle y el panel. */
export const ORIGEN_PUNTO_LABEL: Record<OrigenPunto | 'foto', string> = {
  gps: 'GPS',
  mapa: 'marcado en el mapa',
  foto: 'foto de cámara',
};

/** Por encima de esto el punto no alcanza para identificar la obra: se avisa
 * para que lo vuelva a tomar al aire libre. */
const ERROR_ALTO_M = 100;

/** Acción secundaria del recuadro: texto subrayado, pero con área táctil de
 * 44 px (en obra se toca con el pulgar y a veces con guantes). */
const ACCION = `inline-flex min-h-11 items-center px-2 underline underline-offset-2 disabled:opacity-50 ${FOCO_VISIBLE}`;

const BOTON_GRANDE = `flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 bg-surface px-3 text-sm font-semibold text-ink transition hover:bg-graphite/5 disabled:opacity-50 ${FOCO_VISIBLE}`;

function IconoPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconoMapa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

/**
 * Ubicación del reporte (ADR-027): "Tomar mi ubicación" con el GPS estando en
 * el lugar, o "Marcarla en el mapa" para quien carga más tarde o no tiene
 * señal (revisión 2026-10-15). Obligatoria en la paralización. Vale lo mismo
 * de las dos formas: lo que importa es dónde pasó, no dónde está la persona.
 */
export function BotonUbicacion({
  valor,
  onChange,
  obligatorio,
  deshabilitado,
  conMapa,
  centroMapa,
  idCampo,
  idError,
  onFallo,
}: {
  valor: PuntoReporte | null;
  onChange: (p: PuntoReporte | null) => void;
  obligatorio: boolean;
  deshabilitado?: boolean;
  /** Ofrece marcar el punto en el mapa (en el alta; al editar un reporte ya
   * enviado, el pin solo lo mueve HyS). */
  conMapa: boolean;
  /** Dónde arranca el mapa si todavía no hay punto. */
  centroMapa: Centro;
  /** id del botón principal, para llevar el foco cuando falta el punto. */
  idCampo?: string;
  /** id del mensaje de error del formulario, si falta el punto. */
  idError?: string;
  /** No se pudo obtener la ubicación (sin señal, permiso negado): el
   * formulario ofrece el mapa o seguir sin punto. */
  onFallo?: () => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapaAbierto, setMapaAbierto] = useState(false);

  async function tomar() {
    setBuscando(true);
    setError(null);
    const p = await obtenerUbicacion(20_000);
    setBuscando(false);
    if (!p) {
      onFallo?.();
      setError(
        conMapa
          ? 'No pudimos obtener la ubicación. Marcala en el mapa, o revisá que el celular tenga el GPS prendido y que le hayas dado permiso al navegador.'
          : 'No pudimos obtener la ubicación. Revisá que el celular tenga el GPS prendido y que le hayas dado permiso al navegador.',
      );
      return;
    }
    onChange({ latitud: p.latitud, longitud: p.longitud, errorMetros: Math.round(p.errorMetros), origen: 'gps' });
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-ink">
          Ubicación{' '}
          <span className="font-normal text-slate">{obligatorio ? '(obligatoria: hay que saber de qué obra se trata)' : '(opcional)'}</span>
        </p>
        <p className="mt-0.5 text-xs text-slate">
          Marcá dónde pasó, no dónde estás ahora.
          {conMapa && ' Si lo cargás más tarde, ubicalo en el mapa.'} Con el punto, HyS llega más rápido a la obra y lo tiene en
          cuenta al calificar tu reporte.
        </p>
      </div>
      {valor ? (
        <div className="space-y-1 rounded-lg border border-approved/30 bg-approved/5 px-3 py-2 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-approved" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {valor.origen === 'mapa' ? 'Ubicación marcada en el mapa' : `Ubicación tomada · ±${valor.errorMetros ?? '?'} m`}
          </p>
          <div className="-mx-2 flex flex-wrap items-center">
            <a href={urlMapa(valor)} target="_blank" rel="noreferrer" className={`${ACCION} text-brand-deep`}>
              Ver en el mapa
            </a>
            {conMapa && (
              <button type="button" disabled={deshabilitado} onClick={() => setMapaAbierto(true)} className={`${ACCION} text-ink`}>
                {valor.origen === 'mapa' ? 'Cambiar en el mapa' : 'Corregir en el mapa'}
              </button>
            )}
            <button type="button" disabled={deshabilitado || buscando} onClick={tomar} className={`${ACCION} text-ink`}>
              {buscando ? 'Buscando…' : valor.origen === 'mapa' ? 'Tomarla con el GPS' : 'Volver a tomar'}
            </button>
            <button type="button" disabled={deshabilitado} onClick={() => onChange(null)} className={`${ACCION} text-ink`}>
              Quitar
            </button>
          </div>
          {valor.origen === 'gps' && valor.errorMetros != null && valor.errorMetros > ERROR_ALTO_M && (
            <p className="flex items-start gap-1.5 text-xs font-medium text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0 text-warn" aria-hidden>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              {conMapa
                ? 'La precisión es baja: si podés, volvé a tomarla al aire libre, o corregila en el mapa.'
                : 'La precisión es baja: si podés, volvé a tomarla al aire libre, lejos de techos y paredes.'}
            </p>
          )}
        </div>
      ) : (
        <div className={conMapa ? 'grid gap-2 sm:grid-cols-2' : undefined}>
          <button
            id={idCampo}
            type="button"
            disabled={deshabilitado || buscando}
            onClick={tomar}
            aria-describedby={idError}
            className={`${BOTON_GRANDE} ${idError ? 'border-danger' : 'border-graphite'}`}
          >
            <IconoPin />
            {buscando ? 'Buscando tu ubicación…' : 'Tomar mi ubicación'}
          </button>
          {conMapa && (
            <button
              type="button"
              disabled={deshabilitado}
              onClick={() => setMapaAbierto(true)}
              aria-describedby={idError}
              className={`${BOTON_GRANDE} ${idError ? 'border-danger' : 'border-graphite'}`}
            >
              <IconoMapa />
              Marcarla en el mapa
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-slate">La app solo guarda la ubicación cuando tocás uno de estos botones.</p>
      {mapaAbierto && (
        <MarcarEnMapaDialog
          inicial={valor}
          centro={centroMapa}
          onCancelar={() => setMapaAbierto(false)}
          onConfirmar={(c) => {
            setMapaAbierto(false);
            setError(null);
            // 6 decimales (~10 cm), lo que guarda la base.
            onChange({ latitud: Number(c.latitud.toFixed(6)), longitud: Number(c.longitud.toFixed(6)), errorMetros: null, origen: 'mapa' });
          }}
        />
      )}
    </div>
  );
}
