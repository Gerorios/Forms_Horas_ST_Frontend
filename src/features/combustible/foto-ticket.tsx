'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { comprimirImagen } from './comprimir-imagen';

export function FotoTicket({
  onFoto,
  cargando,
}: {
  onFoto: (blob: Blob) => void;
  cargando?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    let blob: Blob;
    try {
      blob = await comprimirImagen(archivo);
    } catch {
      // HEIC u otros formatos que createImageBitmap/toBlob no pueden procesar en este
      // navegador: si el archivo original ya es un formato usable, lo usamos sin
      // comprimir; si no, no hay nada razonable para mostrar y pedimos otra foto.
      if (archivo.type === 'image/jpeg' || archivo.type === 'image/png') {
        blob = archivo;
      } else {
        toast.error('No pudimos procesar la imagen. Probá con otra foto (JPG o PNG).');
        return;
      }
    }

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(blob));
    onFoto(blob);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Foto del ticket"
        className="hidden"
        onChange={elegirArchivo}
      />

      {preview ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Ticket de combustible"
            className="max-h-72 w-full rounded-lg border border-line object-contain"
          />
          <button
            type="button"
            disabled={cargando}
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand-deep transition hover:bg-accent disabled:opacity-50"
          >
            Sacar otra foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={cargando}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface px-4 py-10 text-center transition hover:border-brand/60 disabled:opacity-50"
        >
          <span className="text-sm font-medium text-ink">Sacar foto del ticket</span>
          <span className="text-xs text-slate/70">Tocá para abrir la cámara o elegir de la galería</span>
        </button>
      )}

      {cargando && <p className="text-xs text-slate">Leyendo el ticket…</p>}
    </div>
  );
}
