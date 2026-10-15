'use client';

import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMapaReportes, type RangoConsulta, type TipoReporte } from '@/lib/api/seguridad';
import { ErrorCarga } from './error-carga';
import { COLOR_TIPO, ORDEN_TIPOS } from './ficha-mapa';
import type { VistaMapa } from './mapa-reportes';
import { FOCO_VISIBLE, TIPO_LABEL } from './tipos';

// Leaflet usa `window`: solo en el navegador, y se baja recién al abrir.
const MapaReportes = dynamic(() => import('./mapa-reportes'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate">Cargando el mapa…</div>,
});

/** Por debajo de esto, el mapa de calor engaña: cada reporte suelto parece
 * una zona caliente. Se avisa, no se bloquea. */
const MIN_PUNTOS_CALOR = 30;

function IconoCompleto({ salir }: { salir?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {salir ? (
        <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" />
      ) : (
        <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
      )}
    </svg>
  );
}

const CHIP = `inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition ${FOCO_VISIBLE}`;

/**
 * "Mapa de reportes" de Ranking y tableros: dónde pasó cada reporte del rango
 * (ADR-027, revisión 2026-10-15). Cerrado de arranque; los datos se piden
 * recién al abrirlo.
 */
export const MapaReportesSeccion = forwardRef<
  HTMLElement,
  { rango: RangoConsulta; abierto: boolean; onAbrir: (abierto: boolean) => void }
>(function MapaReportesSeccion({ rango, abierto, onAbrir }, ref) {
  const { data, isLoading, isError, isFetching, refetch } = useMapaReportes(rango, abierto);
  const [vista, setVista] = useState<VistaMapa>('pines');
  const [ocultos, setOcultos] = useState<Set<TipoReporte>>(new Set());
  /** Pantalla completa: una capa fija sobre la página (la API de pantalla
   * completa del navegador no anda en iPhone). El mapa no se remonta: solo
   * cambia de tamaño, y Leaflet se reacomoda (ver `AjusteTamano`). */
  const [completo, setCompleto] = useState(false);
  const botonCompleto = useRef<HTMLButtonElement>(null);
  const botonSalir = useRef<HTMLButtonElement>(null);

  /** Al salir, el foco vuelve a "Pantalla completa" (que recién reaparece). */
  const volverFoco = useRef(false);

  useEffect(() => {
    if (!completo) {
      if (volverFoco.current) botonCompleto.current?.focus();
      volverFoco.current = false;
      return;
    }
    volverFoco.current = true;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botonSalir.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCompleto(false);
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener('keydown', alTeclear);
    };
  }, [completo]);

  const puntos = useMemo(() => (data ?? []).filter((p) => !ocultos.has(p.tipo)), [data, ocultos]);
  const cantidadPorTipo = useMemo(() => {
    const c = new Map<TipoReporte, number>();
    for (const p of data ?? []) c.set(p.tipo, (c.get(p.tipo) ?? 0) + 1);
    return c;
  }, [data]);

  function alternarTipo(t: TipoReporte) {
    setOcultos((prev) => {
      const s = new Set(prev);
      if (s.has(t)) s.delete(t);
      else s.add(t);
      return s;
    });
  }

  return (
    <section ref={ref} aria-labelledby="mapa-reportes" className="scroll-mt-4 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="mapa-reportes" className="font-display text-base font-semibold text-ink">
          Mapa de reportes
          {data && <span className="ml-2 font-sans text-sm font-normal text-slate">{data.length} con punto en el rango</span>}
        </h2>
        <button
          type="button"
          aria-expanded={abierto}
          onClick={() => onAbrir(!abierto)}
          className={`inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-semibold text-ink hover:bg-sand ${FOCO_VISIBLE}`}
        >
          {abierto ? 'Ocultar el mapa' : 'Ver el mapa'}
        </button>
      </div>

      {!abierto ? (
        <p className="mt-1 text-sm text-slate">Dónde pasó cada reporte del rango: tocá un pin para ver su ficha.</p>
      ) : isError ? (
        <div className="mt-3">
          <ErrorCarga que="el mapa de reportes" onReintentar={() => refetch()} reintentando={isFetching} />
        </div>
      ) : (
        <div
          {...(completo ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Mapa de reportes en pantalla completa' } : {})}
          className={completo ? 'fixed inset-0 z-[1200] flex flex-col gap-3 bg-surface p-3 sm:p-4' : 'mt-3 space-y-3'}
        >
          {completo && (
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-base font-semibold text-ink">
                Mapa de reportes
                {data && <span className="ml-2 font-sans text-sm font-normal text-slate">{puntos.length} en el mapa</span>}
              </p>
              <button
                ref={botonSalir}
                type="button"
                onClick={() => setCompleto(false)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line px-3 text-sm font-semibold text-ink hover:bg-sand ${FOCO_VISIBLE}`}
              >
                <IconoCompleto salir />
                Salir de pantalla completa
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Tipos de reporte en el mapa" className="flex flex-wrap gap-2">
              {ORDEN_TIPOS.map((t) => {
                const visible = !ocultos.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={visible}
                    onClick={() => alternarTipo(t)}
                    className={`${CHIP} ${visible ? 'border-line bg-surface text-ink' : 'border-dashed border-line bg-sand text-slate line-through'}`}
                  >
                    <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: COLOR_TIPO[t] }} />
                    {TIPO_LABEL[t]}
                    <span className="text-slate">{cantidadPorTipo.get(t) ?? 0}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div role="radiogroup" aria-label="Visualización" className="inline-flex rounded-md border border-line p-0.5">
              {(['pines', 'calor'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={vista === v}
                  onClick={() => setVista(v)}
                  className={`min-h-10 rounded px-3 text-sm font-semibold ${vista === v ? 'bg-graphite text-white' : 'text-ink hover:bg-sand'} ${FOCO_VISIBLE}`}
                >
                  {v === 'pines' ? 'Pines' : 'Mapa de calor'}
                </button>
              ))}
              </div>
              {!completo && (
                <button
                  ref={botonCompleto}
                  type="button"
                  onClick={() => setCompleto(true)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line px-3 text-sm font-semibold text-ink hover:bg-sand ${FOCO_VISIBLE}`}
                >
                  <IconoCompleto />
                  Pantalla completa
                </button>
              )}
            </div>
          </div>
          {vista === 'calor' && data && data.length < MIN_PUNTOS_CALOR && (
            <p role="status" className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-ink">
              Con {data.length} {data.length === 1 ? 'reporte' : 'reportes'} el mapa de calor todavía no dice mucho: cada reporte
              suelto parece una zona caliente. Sirve para el estudio de fin de período, con más datos.
            </p>
          )}
          <div className={`overflow-hidden rounded-lg border border-line ${completo ? 'min-h-0 flex-1' : 'h-[60dvh] min-h-80'}`}>
            {isLoading || !data ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">Cargando los reportes…</div>
            ) : (
              <MapaReportes puntos={puntos} vista={vista} />
            )}
          </div>
          {data && data.length === 0 && (
            <p className="text-sm text-slate">Ningún reporte del rango tiene punto en el mapa.</p>
          )}
        </div>
      )}
    </section>
  );
});
