'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { abrirAdjuntoNovedad, useAgregarCertificado, useQuitarCertificado } from '@/lib/api/novedades';
import { MAX_ADJUNTOS_POR_NOVEDAD, type Novedad, type NovedadAdjunto } from '@/types/domain';

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];

const ETIQUETA_TIPO: Record<NovedadAdjunto['mimetype'], string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'application/pdf': 'PDF',
};

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Certificados de una novedad: lista + agregar + quitar. Vive dentro del
 * detalle y lo comparten /novedades (el supervisor sube) y /ausencias (HyS
 * mira lo mismo).
 *
 * Regla que atraviesa el componente: agregar un certificado NO cambia el
 * estado de la novedad. Si llega después de que HyS resolvió, el aviso viaja
 * en `certificadoPosteriorAResolucion` y reabrir sigue siendo decisión de HyS.
 *
 * Los permisos los hace cumplir el backend; acá se ocultan las acciones que
 * ese usuario no puede hacer, para no ofrecer botones que van a dar 403.
 */
export function CertificadosNovedad({
  novedad,
  cuilUsuario,
  rolUsuario,
}: {
  novedad: Novedad;
  cuilUsuario: string;
  rolUsuario: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const agregar = useAgregarCertificado();
  const quitar = useQuitarCertificado();

  const adjuntos = novedad.adjuntos ?? [];
  const anulada = novedad.estado === 'anulada';
  const resuelta = novedad.estadoHys === 'aprobada' || novedad.estadoHys === 'desaprobada';
  const enTope = adjuntos.length >= MAX_ADJUNTOS_POR_NOVEDAD;
  const ocupado = agregar.isPending || quitar.isPending;

  // Una novedad anulada es un registro congelado (mismo criterio que editar).
  const puedeAgregar = !anulada;

  /** Resuelta = la prueba que respalda la decisión de HyS queda congelada.
   * Antes de eso, cada uno saca lo suyo; HyS saca cualquiera. */
  function puedeQuitar(adjunto: NovedadAdjunto): boolean {
    if (anulada || resuelta) return false;
    if (rolUsuario === 'Admin' || rolUsuario === 'HyS') return true;
    return adjunto.subidoPorCuil === cuilUsuario;
  }

  async function ver(adjunto: NovedadAdjunto) {
    try {
      await abrirAdjuntoNovedad(novedad.id, adjunto.id);
    } catch {
      toast.error('No se pudo abrir el certificado');
    }
  }

  // Mismos límites que valida el backend: rechazar acá evita subir 20 MB por
  // datos móviles para recibir un error después (revisión 2026-08-19).
  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!MIMES_PERMITIDOS.includes(archivo.type)) {
      setError('Solo se aceptan fotos (JPG o PNG) o PDF. Elegí otro archivo.');
      return;
    }
    if (archivo.size > MAX_BYTES) {
      const mb = (archivo.size / 1024 / 1024).toFixed(1);
      setError(
        `El archivo pesa ${mb} MB y el máximo es ${MAX_MB} MB. Sacá la foto con menos calidad o subí un PDF más liviano.`,
      );
      return;
    }
    setError(null);
    const promesa = agregar.mutateAsync({ id: novedad.id, archivo });
    toast.promise(promesa, {
      loading: 'Subiendo el certificado…',
      success: 'Certificado agregado',
      error: 'No se pudo subir el certificado',
    });
  }

  function quitarCertificado(adjunto: NovedadAdjunto) {
    const promesa = quitar.mutateAsync({ id: novedad.id, adjuntoId: adjunto.id });
    toast.promise(promesa, {
      loading: 'Quitando el certificado…',
      success: 'Certificado quitado',
      error: 'No se pudo quitar el certificado',
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate">Certificados</p>
        {adjuntos.length > 0 && (
          <span className="text-[11px] tabular-nums text-slate">
            {adjuntos.length} de {MAX_ADJUNTOS_POR_NOVEDAD}
          </span>
        )}
      </div>

      {adjuntos.length === 0 ? (
        <p className="mt-1 text-sm text-ink">—</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {adjuntos.map((a) => {
            const posterior =
              novedad.certificadoPosteriorAResolucion && a.id === adjuntos[adjuntos.length - 1].id;
            return (
              <li
                key={a.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  posterior ? 'border-brand/60 bg-brand/5' : 'border-line bg-sand'
                }`}
              >
                <span className="grid size-7 flex-none place-items-center rounded-md bg-accent text-[9px] font-medium text-brand-deep">
                  {ETIQUETA_TIPO[a.mimetype] ?? 'ARCH'}
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => ver(a)}
                    className="block max-w-full truncate text-sm font-medium text-brand-deep underline transition hover:no-underline"
                  >
                    Ver certificado
                  </button>
                  <p className="truncate text-xs text-slate">
                    {a.subidoPor || a.subidoPorCuil} · {formatearFechaHora(a.subidoEn)}
                    {posterior && ' · posterior a la resolución'}
                  </p>
                </div>
                {puedeQuitar(a) ? (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => quitarCertificado(a)}
                    className="flex-none rounded px-1 py-0.5 text-xs text-danger transition hover:underline disabled:opacity-50"
                  >
                    Quitar
                  </button>
                ) : (
                  <span
                    className="flex-none text-xs text-slate"
                    title={
                      resuelta
                        ? 'La novedad ya fue resuelta por HyS: sus certificados quedan como respaldo de esa decisión.'
                        : 'Solo podés quitar los certificados que subiste vos.'
                    }
                  >
                    🔒
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {puedeAgregar && (
        <>
          <input
            ref={inputRef}
            id={`certificado-novedad-${novedad.id}`}
            type="file"
            accept="image/*,application/pdf"
            aria-label="Agregar certificado"
            onChange={elegirArchivo}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-fit"
            disabled={enTope || ocupado}
            onClick={() => inputRef.current?.click()}
          >
            {agregar.isPending ? 'Subiendo…' : '+ Agregar certificado'}
          </Button>
          <p className={`mt-2 text-xs ${enTope ? 'text-warn' : 'text-slate'}`}>
            {enTope
              ? `Llegaste al máximo de ${MAX_ADJUNTOS_POR_NOVEDAD} certificados para esta novedad.`
              : `JPEG, PNG o PDF · hasta ${MAX_MB} MB`}
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
