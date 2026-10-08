'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { FotoParaSubir, FotoReporte, GrupoFoto } from '@/lib/api/seguridad';
import { capturar } from './captura-foto';
import { MAX_FOTOS_POR_GRUPO } from './tipos';
import { VisorFotos, useFotoProtegida, type FotoVisor } from './visor-fotos';

/** Miniatura de una foto ya subida (se pide con el token). */
export function FotoProtegida({ reporteId, fotoId, alt }: { reporteId: number; fotoId: number; alt: string }) {
  const { src, error } = useFotoProtegida(reporteId, fotoId);
  if (error) return <div className="flex h-full items-center justify-center p-2 text-xs text-slate">No se pudo cargar</div>;
  if (!src) return <div className="h-full w-full animate-pulse bg-line/60" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-full w-full object-cover" />;
}

/** Foto nueva todavía sin subir: preview local. */
function FotoLocal({ blob, alt }: { blob: Blob; alt: string }) {
  const src = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-full w-full object-cover" />;
}

function RotuloOrigen({ origen, conUbicacion }: { origen: 'camara' | 'galeria'; conUbicacion: boolean }) {
  return (
    <span className="absolute inset-x-0 bottom-0 bg-graphite/75 px-1.5 py-1 text-[11px] font-medium text-white">
      {origen === 'camara' ? (conUbicacion ? 'Cámara · con ubicación' : 'Cámara · sin ubicación') : 'Galería'}
    </span>
  );
}

const BOTON_QUITAR =
  'absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-graphite/80 text-white hover:bg-graphite';

function IconoQuitar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Un grupo de fotos (del riesgo o del control): las ya subidas (al editar un
 * reporte pendiente) más las nuevas, que se suben al guardar. Dos botones:
 * "Sacar foto" abre la cámara y guarda la ubicación de ese momento; "Galería"
 * no lleva ubicación (ver captura-foto.ts).
 */
export function FotosGrupo({
  titulo,
  grupo,
  reporteId,
  existentes,
  nuevas,
  onAgregar,
  onQuitarNueva,
  onQuitarExistente,
  deshabilitado,
}: {
  titulo: string;
  grupo: GrupoFoto;
  reporteId?: number;
  existentes: FotoReporte[];
  nuevas: FotoParaSubir[];
  onAgregar: (foto: FotoParaSubir) => void;
  onQuitarNueva: (indice: number) => void;
  onQuitarExistente?: (fotoId: number) => void;
  deshabilitado?: boolean;
}) {
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const total = existentes.length + nuevas.length;
  const lleno = total >= MAX_FOTOS_POR_GRUPO;

  async function elegir(e: React.ChangeEvent<HTMLInputElement>, desdeCamara: boolean) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setProcesando(true);
    try {
      const foto = await capturar(archivo, grupo, desdeCamara);
      if (!foto) {
        toast.error('No pudimos procesar la imagen. Probá con otra foto (JPG o PNG).');
        return;
      }
      if (desdeCamara && foto.origen === 'galeria') {
        toast.message('La foto no es de recién: se guarda como de galería, sin ubicación.');
      }
      onAgregar(foto);
    } finally {
      setProcesando(false);
    }
  }

  const casilla = 'relative aspect-square overflow-hidden rounded-lg border border-line bg-graphite/10';
  // Tocar una miniatura la abre a pantalla completa; el orden es el de la grilla.
  const paraVisor: FotoVisor[] = [
    ...(reporteId != null ? existentes.map((f) => ({ reporteId, fotoId: f.id, alt: titulo })) : []),
    ...nuevas.map((f) => ({ blob: f.blob, alt: titulo })),
  ];
  const offsetNuevas = reporteId != null ? existentes.length : 0;
  const ampliar = 'absolute inset-0 h-full w-full cursor-zoom-in';

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">
        {titulo} <span className="font-normal text-slate">(hasta {MAX_FOTOS_POR_GRUPO}, opcional)</span>
      </p>
      {total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {existentes.map((f, i) => (
            <div key={`e${f.id}`} className={casilla}>
              {reporteId != null && (
                <button type="button" aria-label={`Ampliar ${titulo.toLowerCase()}`} onClick={() => setAbierta(i)} className={ampliar}>
                  <FotoProtegida reporteId={reporteId} fotoId={f.id} alt={titulo} />
                </button>
              )}
              <RotuloOrigen origen={f.origen} conUbicacion={f.conUbicacion} />
              {onQuitarExistente && (
                <button type="button" aria-label="Quitar foto" disabled={deshabilitado} onClick={() => onQuitarExistente(f.id)} className={BOTON_QUITAR}>
                  <IconoQuitar />
                </button>
              )}
            </div>
          ))}
          {nuevas.map((f, i) => (
            <div key={`n${i}`} className={casilla}>
              <button type="button" aria-label={`Ampliar ${titulo.toLowerCase()}`} onClick={() => setAbierta(offsetNuevas + i)} className={ampliar}>
                <FotoLocal blob={f.blob} alt={titulo} />
              </button>
              <RotuloOrigen origen={f.origen} conUbicacion={f.ubicacion != null} />
              <button type="button" aria-label="Quitar foto" disabled={deshabilitado} onClick={() => onQuitarNueva(i)} className={BOTON_QUITAR}>
                <IconoQuitar />
              </button>
            </div>
          ))}
        </div>
      )}
      {abierta != null && <VisorFotos fotos={paraVisor} inicio={abierta} onCerrar={() => setAbierta(null)} />}
      {!lleno && (
        <div className="grid grid-cols-2 gap-2">
          {/* `capture` abre la cámara directo: solo esta foto guarda ubicación. */}
          <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label={`${titulo}: sacar foto`} onChange={(e) => elegir(e, true)} />
          <input ref={galeriaRef} type="file" accept="image/*" className="hidden" aria-label={`${titulo}: elegir de la galería`} onChange={(e) => elegir(e, false)} />
          <button
            type="button"
            disabled={deshabilitado || procesando}
            onClick={() => camaraRef.current?.click()}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-graphite px-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {procesando ? 'Procesando…' : 'Sacar foto'}
          </button>
          <button
            type="button"
            disabled={deshabilitado || procesando}
            onClick={() => galeriaRef.current?.click()}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:bg-accent/60 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            Galería
          </button>
        </div>
      )}
    </div>
  );
}
