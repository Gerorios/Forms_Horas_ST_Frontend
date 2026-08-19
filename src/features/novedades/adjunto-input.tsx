'use client';

import { useRef, useState } from 'react';

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];

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
  const [error, setError] = useState<string | null>(null);

  // Mismos límites que valida el backend: rechazar acá evita subir 20 MB por
  // datos móviles para recibir un error después (revisión 2026-08-19).
  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!MIMES_PERMITIDOS.includes(archivo.type)) {
      setError('Solo se aceptan fotos (JPG o PNG) o PDF. Elegí otro archivo.');
      setNombre(null);
      e.target.value = '';
      return;
    }
    if (archivo.size > MAX_BYTES) {
      const mb = (archivo.size / 1024 / 1024).toFixed(1);
      setError(`El archivo pesa ${mb} MB y el máximo es ${MAX_MB} MB. Sacá la foto con menos calidad o subí un PDF más liviano.`);
      setNombre(null);
      e.target.value = '';
      return;
    }
    setError(null);
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
      {error && (
        <span role="alert" className="text-xs font-normal text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
