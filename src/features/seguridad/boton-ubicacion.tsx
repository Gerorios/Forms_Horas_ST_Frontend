'use client';

import { useState } from 'react';
import { obtenerUbicacion } from './captura-foto';
import { FOCO_VISIBLE } from './tipos';

export interface PuntoGps {
  latitud: number;
  longitud: number;
  errorMetros: number;
}

export const urlMapa = (p: { latitud: number; longitud: number }) =>
  `https://www.openstreetmap.org/?mlat=${p.latitud}&mlon=${p.longitud}#map=18/${p.latitud}/${p.longitud}`;

/** Por encima de esto el punto no alcanza para identificar la obra: se avisa
 * para que lo vuelva a tomar al aire libre. */
const ERROR_ALTO_M = 100;

/** Acción secundaria del recuadro: texto subrayado, pero con área táctil de
 * 44 px (en obra se toca con el pulgar y a veces con guantes). */
const ACCION = `inline-flex min-h-11 items-center px-2 underline underline-offset-2 disabled:opacity-50 ${FOCO_VISIBLE}`;

/**
 * "Tomar mi ubicación" (ADR-027, revisión 2026-10-08): el punto GPS del
 * reporte, para saber de qué obra se trata. Obligatorio en la paralización.
 * Sin mapa para corregir: se muestra la precisión y un link para verlo.
 */
export function BotonUbicacion({
  valor,
  onChange,
  obligatorio,
  deshabilitado,
  idCampo,
  idError,
  onFallo,
}: {
  valor: PuntoGps | null;
  onChange: (p: PuntoGps | null) => void;
  obligatorio: boolean;
  deshabilitado?: boolean;
  /** id del botón principal, para llevar el foco cuando falta el punto. */
  idCampo?: string;
  /** id del mensaje de error del formulario, si falta el punto. */
  idError?: string;
  /** No se pudo obtener la ubicación (sin señal, permiso negado): el
   * formulario ofrece seguir sin punto. */
  onFallo?: () => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tomar() {
    setBuscando(true);
    setError(null);
    const p = await obtenerUbicacion(20_000);
    setBuscando(false);
    if (!p) {
      onFallo?.();
      setError('No pudimos obtener la ubicación. Revisá que el celular tenga el GPS prendido y que le hayas dado permiso al navegador.');
      return;
    }
    onChange({ ...p, errorMetros: Math.round(p.errorMetros) });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">
        Ubicación GPS{' '}
        <span className="font-normal text-slate">{obligatorio ? '(obligatoria: hay que saber de qué obra se trata)' : '(opcional)'}</span>
      </p>
      {valor ? (
        <div className="space-y-1 rounded-lg border border-approved/30 bg-approved/5 px-3 py-2 text-sm">
          <p className="font-medium text-ink">Ubicación tomada · ±{valor.errorMetros} m</p>
          <div className="-mx-2 flex flex-wrap items-center">
            <a href={urlMapa(valor)} target="_blank" rel="noreferrer" className={`${ACCION} text-brand-deep`}>
              Ver en el mapa
            </a>
            <button type="button" disabled={deshabilitado || buscando} onClick={tomar} className={`${ACCION} text-ink`}>
              {buscando ? 'Buscando…' : 'Volver a tomar'}
            </button>
            <button type="button" disabled={deshabilitado} onClick={() => onChange(null)} className={`${ACCION} text-ink`}>
              Quitar
            </button>
          </div>
          {valor.errorMetros > ERROR_ALTO_M && (
            <p className="flex items-start gap-1.5 text-xs font-medium text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0 text-warn" aria-hidden>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              La precisión es baja: si podés, volvé a tomarla al aire libre, lejos de techos y paredes.
            </p>
          )}
        </div>
      ) : (
        <button
          id={idCampo}
          type="button"
          disabled={deshabilitado || buscando}
          onClick={tomar}
          aria-describedby={idError}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 bg-surface px-3 text-sm font-semibold text-ink transition hover:bg-graphite/5 disabled:opacity-50 ${
            idError ? 'border-danger' : 'border-graphite'
          } ${FOCO_VISIBLE}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {buscando ? 'Buscando tu ubicación…' : 'Tomar mi ubicación'}
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-slate">Tomala estando en el lugar. La app solo guarda la ubicación cuando tocás el botón.</p>
    </div>
  );
}
