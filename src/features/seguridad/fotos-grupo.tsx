'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { FotoParaSubir, FotoReporte, GrupoFoto } from '@/lib/api/seguridad';
import { capturar } from './captura-foto';
import { FOCO_VISIBLE, MAX_FOTOS_POR_GRUPO } from './tipos';
import { VisorFotos, useFotoProtegida, type FotoVisor } from './visor-fotos';

/** Una foto nueva del formulario y cómo va su subida. Las que fallan no se
 * descartan: quedan en pantalla (y en el borrador) para reintentarlas. */
export type EstadoSubida = 'pendiente' | 'subiendo' | 'ok' | 'error';

export interface FotoNueva {
  clave: string;
  foto: FotoParaSubir;
  estado: EstadoSubida;
}

/**
 * Miniatura de una foto ya subida (se pide con el token). Arma su propio
 * botón: "Ampliar" si cargó, "Reintentar" si falló, nunca uno adentro del
 * otro. Sin `onAmpliar` es solo la imagen.
 */
export function FotoProtegida({
  reporteId,
  fotoId,
  alt,
  onAmpliar,
  className = '',
}: {
  reporteId: number;
  fotoId: number;
  alt: string;
  onAmpliar?: () => void;
  className?: string;
}) {
  const { src, error, reintentar } = useFotoProtegida(reporteId, fotoId);
  if (error) {
    return (
      <button
        type="button"
        onClick={reintentar}
        aria-label={`No se pudo cargar ${alt.toLowerCase()}. Reintentar`}
        className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-sand p-2 text-center text-xs text-ink ${FOCO_VISIBLE} ${className}`}
      >
        No se pudo cargar
        <span className="font-semibold underline underline-offset-2">Reintentar</span>
      </button>
    );
  }
  const img = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-full w-full object-cover" />
  ) : (
    <span className="block h-full w-full animate-pulse bg-line/60" />
  );
  if (!onAmpliar) return src ? img : <div className={`h-full w-full ${className}`}>{img}</div>;
  return (
    <button type="button" aria-label={`Ampliar: ${alt.toLowerCase()}`} onClick={onAmpliar} className={`h-full w-full cursor-zoom-in ${FOCO_VISIBLE} ${className}`}>
      {img}
    </button>
  );
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
    <span className="absolute inset-x-0 bottom-0 bg-graphite/80 px-1.5 py-1 text-[11px] font-medium text-white">
      {origen === 'camara' ? (conUbicacion ? 'Cámara · con ubicación' : 'Cámara · sin ubicación') : 'Galería'}
    </span>
  );
}

/** Lo que pasa con la subida de una foto nueva, sobre la miniatura. */
function EstadoFoto({ estado, onReintentar }: { estado: EstadoSubida; onReintentar: () => void }) {
  if (estado === 'pendiente') return null;
  if (estado === 'subiendo') {
    return (
      <span role="status" className="absolute inset-x-0 top-0 bg-graphite/80 px-1.5 py-1 text-[11px] font-medium text-white">
        Subiendo…
      </span>
    );
  }
  if (estado === 'ok') {
    return (
      <span className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-approved text-white" aria-label="Foto subida">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 12 5 5 9-10" />
        </svg>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onReintentar}
      className={`absolute inset-x-0 top-0 flex min-h-11 items-center justify-center bg-danger px-1 text-xs font-semibold text-white ${FOCO_VISIBLE}`}
    >
      No se subió · Reintentar
    </button>
  );
}

const BOTON_QUITAR = `absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-graphite/85 text-white hover:bg-graphite ${FOCO_VISIBLE}`;

function IconoQuitar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Un grupo de fotos (del riesgo o del control): las ya subidas (al editar un
 * reporte pendiente) más las nuevas, que se suben al guardar y muestran su
 * estado (subiendo, ✓, o no se subió con Reintentar). Dos botones: "Sacar
 * foto" abre la cámara y guarda la ubicación de ese momento; "Galería" no
 * lleva ubicación (ver captura-foto.ts).
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
  onReintentar,
  deshabilitado,
  bloquearAgregado,
}: {
  titulo: string;
  grupo: GrupoFoto;
  reporteId?: number;
  existentes: FotoReporte[];
  nuevas: FotoNueva[];
  onAgregar: (foto: FotoParaSubir) => void;
  onQuitarNueva: (clave: string) => void;
  onQuitarExistente?: (fotoId: number) => void;
  onReintentar: (clave: string) => void;
  deshabilitado?: boolean;
  /** Ya no se suman fotos (p. ej. el reporte se creó y solo falta completar las que fallaron). */
  bloquearAgregado?: boolean;
}) {
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const total = existentes.length + nuevas.length;
  const lleno = total >= MAX_FOTOS_POR_GRUPO;
  const nombre = (n: number) => `${titulo} ${n}`;

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
    ...(reporteId != null ? existentes.map((f, i) => ({ reporteId, fotoId: f.id, alt: nombre(i + 1) })) : []),
    ...nuevas.map((f, i) => ({ blob: f.foto.blob, alt: nombre(existentes.length + i + 1) })),
  ];
  const offsetNuevas = reporteId != null ? existentes.length : 0;
  const ampliar = `absolute inset-0 h-full w-full cursor-zoom-in ${FOCO_VISIBLE}`;
  const botonBase = `flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition disabled:opacity-50 ${FOCO_VISIBLE}`;

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
                <FotoProtegida reporteId={reporteId} fotoId={f.id} alt={nombre(i + 1)} onAmpliar={() => setAbierta(i)} className="absolute inset-0" />
              )}
              <RotuloOrigen origen={f.origen} conUbicacion={f.conUbicacion} />
              {onQuitarExistente && (
                <button type="button" aria-label={`Quitar ${nombre(i + 1).toLowerCase()}`} disabled={deshabilitado} onClick={() => onQuitarExistente(f.id)} className={BOTON_QUITAR}>
                  <IconoQuitar />
                </button>
              )}
            </div>
          ))}
          {nuevas.map((f, i) => {
            const n = existentes.length + i + 1;
            return (
              <div key={f.clave} className={casilla}>
                <button type="button" aria-label={`Ampliar: ${nombre(n).toLowerCase()}`} onClick={() => setAbierta(offsetNuevas + i)} className={ampliar}>
                  <FotoLocal blob={f.foto.blob} alt={nombre(n)} />
                </button>
                <RotuloOrigen origen={f.foto.origen} conUbicacion={f.foto.ubicacion != null} />
                <EstadoFoto estado={f.estado} onReintentar={() => onReintentar(f.clave)} />
                {(f.estado === 'pendiente' || f.estado === 'error') && !deshabilitado && (
                  <button type="button" aria-label={`Quitar ${nombre(n).toLowerCase()}`} onClick={() => onQuitarNueva(f.clave)} className={BOTON_QUITAR}>
                    <IconoQuitar />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {abierta != null && <VisorFotos fotos={paraVisor} inicio={abierta} onCerrar={() => setAbierta(null)} />}
      {!lleno && !bloquearAgregado && (
        <div className="grid grid-cols-2 gap-2">
          {/* `capture` abre la cámara directo: solo esta foto guarda ubicación. */}
          <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label={`${titulo}: sacar foto`} onChange={(e) => elegir(e, true)} />
          <input ref={galeriaRef} type="file" accept="image/*" className="hidden" aria-label={`${titulo}: elegir de la galería`} onChange={(e) => elegir(e, false)} />
          {/* Secundarios oscuros: el único primario de la pantalla es "Enviar". */}
          <button
            type="button"
            disabled={deshabilitado || procesando}
            onClick={() => camaraRef.current?.click()}
            className={`${botonBase} border-2 border-graphite bg-surface text-ink hover:bg-graphite/5`}
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
            className={`${botonBase} border border-line bg-surface text-ink hover:bg-accent/60`}
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
