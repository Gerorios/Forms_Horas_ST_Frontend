'use client';

import { useRef, useState } from 'react';

/** Input de archivo simple para el certificado de una novedad — a propósito
 * NO reusa FotoTicket (esa es cámara-first, solo imagen y comprime del lado
 * del cliente; acá el adjunto también puede ser PDF y no corresponde
 * recomprimir un certificado). Sin preview: solo el nombre del archivo
 * elegido. */
export function AdjuntoInput({
  label = 'Certificado (opcional)',
  onArchivo,
  disabled,
}: {
  label?: string;
  onArchivo: (archivo: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState<string | null>(null);

  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setNombre(archivo.name);
    onArchivo(archivo);
  }

  return (
    <div className="flex flex-col gap-1 text-sm font-medium text-ink">
      {label}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        aria-label={label}
        onChange={elegirArchivo}
        className="hidden"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-fit rounded-md border border-line px-3 py-1.5 text-sm font-normal text-ink transition hover:bg-accent/60 disabled:opacity-50"
      >
        {nombre ? 'Cambiar archivo' : 'Elegir archivo'}
      </button>
      {nombre && <span className="text-xs font-normal text-slate">{nombre}</span>}
    </div>
  );
}
