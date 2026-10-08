'use client';

import { useState } from 'react';
import { obtenerUbicacion } from './captura-foto';

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
}: {
  valor: PuntoGps | null;
  onChange: (p: PuntoGps | null) => void;
  obligatorio: boolean;
  deshabilitado?: boolean;
}) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tomar() {
    setBuscando(true);
    setError(null);
    const p = await obtenerUbicacion(20_000);
    setBuscando(false);
    if (!p) {
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-approved/30 bg-approved/5 px-3 py-2 text-sm">
          <span className="font-medium text-ink">Ubicación tomada · ±{valor.errorMetros} m</span>
          <a href={urlMapa(valor)} target="_blank" rel="noreferrer" className="text-brand-deep underline">
            Ver en el mapa
          </a>
          <button type="button" disabled={deshabilitado || buscando} onClick={tomar} className="text-slate underline disabled:opacity-50">
            {buscando ? 'Buscando…' : 'Volver a tomar'}
          </button>
          <button type="button" disabled={deshabilitado} onClick={() => onChange(null)} className="text-slate underline disabled:opacity-50">
            Quitar
          </button>
          {valor.errorMetros > ERROR_ALTO_M && (
            <p className="w-full text-xs text-warn">
              La precisión es baja: si podés, volvé a tomarla al aire libre, lejos de techos y paredes.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={deshabilitado || buscando}
          onClick={tomar}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-graphite px-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
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
