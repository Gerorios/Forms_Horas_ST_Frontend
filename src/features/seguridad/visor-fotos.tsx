'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { urlFoto } from '@/lib/api/seguridad';

/** Una foto del visor: ya subida (se pide con el token) o local, todavía sin subir. */
export type FotoVisor = { reporteId: number; fotoId: number; alt: string } | { blob: Blob; alt: string };

/** URL de una foto ya subida: se pide con el token (no sirve un <img src>
 * directo), mismo patrón que FotoTicketView. */
export function useFotoProtegida(reporteId: number, fotoId: number) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let url: string | null = null;
    let cancelado = false;
    api
      .get(urlFoto(reporteId, fotoId), { responseType: 'blob' })
      .then((r) => {
        if (cancelado) return;
        url = URL.createObjectURL(r.data);
        setSrc(url);
      })
      .catch(() => !cancelado && setError(true));
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [reporteId, fotoId]);
  return { src, error };
}

function useSrcLocal(blob: Blob) {
  const src = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);
  return src;
}

/**
 * La foto grande. Ajustada a la pantalla por defecto; un toque (o clic) la
 * muestra a tamaño real dentro de un contenedor con scroll, para recorrer la
 * zona. En el celular además se puede pellizcar para hacer zoom.
 */
function FotoGrande({ src, alt }: { src: string; alt: string }) {
  const [real, setReal] = useState(false);
  return (
    <div className={`h-full w-full ${real ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden'}`} style={{ touchAction: 'pinch-zoom pan-x pan-y' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setReal((r) => !r)}
        className={real ? 'max-w-none cursor-zoom-out' : 'max-h-full max-w-full cursor-zoom-in object-contain'}
      />
    </div>
  );
}

function FotoGrandeProtegida({ reporteId, fotoId, alt }: { reporteId: number; fotoId: number; alt: string }) {
  const { src, error } = useFotoProtegida(reporteId, fotoId);
  if (error) return <p className="text-sm text-white/80">No se pudo cargar la foto.</p>;
  if (!src) return <p className="text-sm text-white/80">Cargando…</p>;
  return <FotoGrande src={src} alt={alt} />;
}

function FotoGrandeLocal({ blob, alt }: { blob: Blob; alt: string }) {
  return <FotoGrande src={useSrcLocal(blob)} alt={alt} />;
}

const BOTON = 'flex h-11 min-w-11 items-center justify-center rounded-full bg-white/15 px-3 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-30';

/** Visor a pantalla completa de las fotos de un reporte, con anterior/siguiente. */
export function VisorFotos({ fotos, inicio, onCerrar }: { fotos: FotoVisor[]; inicio: number; onCerrar: () => void }) {
  const [i, setI] = useState(inicio);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const foto = fotos[i];

  useEffect(() => {
    cerrarRef.current?.focus();
  }, []);

  if (!foto) return null;
  const hay = fotos.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      className="fixed inset-0 z-[60] flex flex-col bg-black/95"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCerrar();
        if (e.key === 'ArrowRight' && i < fotos.length - 1) setI(i + 1);
        if (e.key === 'ArrowLeft' && i > 0) setI(i - 1);
      }}
    >
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="text-sm text-white/80">
          {foto.alt}
          {hay ? ` · ${i + 1} de ${fotos.length}` : ''}
        </span>
        <button ref={cerrarRef} type="button" onClick={onCerrar} className={BOTON} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 px-2">
        {'blob' in foto ? (
          <FotoGrandeLocal key={i} blob={foto.blob} alt={foto.alt} />
        ) : (
          <FotoGrandeProtegida key={i} reporteId={foto.reporteId} fotoId={foto.fotoId} alt={foto.alt} />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <button type="button" disabled={!hay || i === 0} onClick={() => setI(i - 1)} className={BOTON} aria-label="Foto anterior">
          ‹ Anterior
        </button>
        <span className="text-xs text-white/60">Tocá la foto para verla a tamaño real</span>
        <button type="button" disabled={!hay || i === fotos.length - 1} onClick={() => setI(i + 1)} className={BOTON} aria-label="Foto siguiente">
          Siguiente ›
        </button>
      </div>
    </div>
  );
}
