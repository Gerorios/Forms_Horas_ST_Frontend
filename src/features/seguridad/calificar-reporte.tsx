'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { mensajeDeError } from '@/lib/api/liquidacion';
import { useCalificarReporte, useReabrirReporte, type ReporteSeguridad } from '@/lib/api/seguridad';

const ESCALA = Array.from({ length: 11 }, (_, i) => i);

/** Nadie califica su propio reporte (HyS no es juez y parte). La inspección
 * es la excepción: su autora no suma puntos. Espejo de `puedeCalificar` del
 * backend, que es quien manda. */
export function puedeCalificar(r: Pick<ReporteSeguridad, 'tipo' | 'autor'>, miCuil: string | undefined): boolean {
  return r.tipo === 'inspeccion' || r.autor.cuil !== miCuil;
}

/**
 * Calificación de HyS: aprobar con un puntaje de 0 a 10 o desaprobar (vale 0
 * y hay que explicarle al autor por qué). En la inspección el puntaje se
 * RESTA a cada persona observada. Un reporte ya calificado se puede
 * recalificar o reabrir (vuelve a pendiente y el autor puede corregirlo).
 */
export function CalificarReporte({ reporte, miCuil }: { reporte: ReporteSeguridad; miCuil: string | undefined }) {
  const calificar = useCalificarReporte();
  const reabrir = useReabrirReporte();
  const [puntaje, setPuntaje] = useState<number | null>(reporte.puntaje);
  const [comentario, setComentario] = useState(reporte.comentarioHys ?? '');
  const [intentoDesaprobar, setIntentoDesaprobar] = useState(false);

  if (reporte.estado === 'anulado') {
    return <p className="text-sm text-slate">El autor anuló este reporte: no se califica.</p>;
  }
  if (!puedeCalificar(reporte, miCuil)) {
    return (
      <p role="note" className="rounded-lg bg-accent px-3 py-2.5 text-sm text-ink">
        Es tu propio reporte: lo tiene que calificar otra persona de HyS.
      </p>
    );
  }

  const esInspeccion = reporte.tipo === 'inspeccion';
  const ocupado = calificar.isPending || reabrir.isPending;
  const faltaComentario = comentario.trim() === '';

  function enviar(decision: 'aprobar' | 'desaprobar') {
    if (decision === 'desaprobar' && faltaComentario) {
      setIntentoDesaprobar(true);
      return;
    }
    if (decision === 'aprobar' && puntaje == null) return;
    const input =
      decision === 'aprobar'
        ? { decision, puntaje: puntaje!, ...(faltaComentario ? {} : { comentario: comentario.trim() }) }
        : { decision, comentario: comentario.trim() };
    toast.promise(calificar.mutateAsync({ id: reporte.id, input }), {
      loading: 'Guardando calificación…',
      success: decision === 'aprobar' ? 'Reporte aprobado' : 'Reporte desaprobado',
      error: (e) => mensajeDeError(e, 'No se pudo calificar'),
    });
  }

  function reabrirReporte() {
    toast.promise(reabrir.mutateAsync(reporte.id), {
      loading: 'Reabriendo…',
      success: 'Reporte reabierto: volvió a pendiente',
      error: (e) => mensajeDeError(e, 'No se pudo reabrir'),
    });
  }

  // Sumar es verde; una inspección resta y tiene que verse distinta de un
  // vistazo: todo el bloque va en rojo y los números llevan el signo menos.
  const seleccionado = esInspeccion ? 'border-2 border-danger bg-danger text-white' : 'border-2 border-approved bg-approved text-white';

  return (
    <div className={esInspeccion ? 'space-y-3 rounded-xl border border-danger/40 bg-danger/5 p-3' : 'space-y-3'}>
      <p className={`flex items-center gap-2 font-medium ${esInspeccion ? 'text-danger' : 'text-ink'}`}>
        {esInspeccion && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12h8" />
          </svg>
        )}
        {esInspeccion
          ? reporte.estado === 'pendiente'
            ? 'Quitar puntos'
            : 'Corregir la quita de puntos'
          : reporte.estado === 'pendiente'
            ? 'Calificar'
            : 'Recalificar'}
      </p>
      <div className="space-y-1.5">
        <p className={`text-sm ${esInspeccion ? 'font-medium text-danger' : 'text-slate'}`}>
          {esInspeccion ? 'Puntos que pierde cada persona observada' : 'Puntos que suma el autor (0 a 10)'}
        </p>
        <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-label="Puntaje">
          {ESCALA.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={puntaje === n}
              disabled={ocupado}
              onClick={() => setPuntaje(n)}
              className={`h-9 rounded-md font-mono text-sm font-semibold transition ${
                puntaje === n ? seleccionado : 'border border-line bg-surface text-ink hover:bg-accent/60'
              }`}
            >
              {esInspeccion && n > 0 ? `−${n}` : n}
            </button>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm text-slate">
        Comentario para el autor (opcional; obligatorio si desaprobás)
        <textarea
          rows={3}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>
      {intentoDesaprobar && faltaComentario && (
        <p role="alert" className="text-sm text-danger">
          Para desaprobar hay que explicarle al autor por qué.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" disabled={ocupado} onClick={() => enviar('desaprobar')}>
          Desaprobar
        </Button>
        <button
          type="button"
          disabled={ocupado || puntaje == null}
          onClick={() => enviar('aprobar')}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50 ${
            esInspeccion ? 'bg-danger' : 'bg-approved'
          }`}
        >
          {puntaje == null
            ? 'Elegí un puntaje'
            : esInspeccion
              ? puntaje === 0
                ? 'Aprobar sin restar'
                : `Restar ${puntaje} a cada persona`
              : `Aprobar con +${puntaje}`}
        </button>
      </div>
      {(reporte.estado === 'aprobado' || reporte.estado === 'desaprobado') && (
        <Button variant="secondary" disabled={ocupado} onClick={reabrirReporte} className="w-full">
          Reabrir (vuelve a pendiente y se borran sus puntos)
        </Button>
      )}
      <p className="text-xs text-slate">
        Aprobado o desaprobado, el autor ya no lo puede editar: si algo está mal clasificado, corregilo vos (los puntos se
        recalculan) o reabrilo para que lo corrija el autor.
      </p>
    </div>
  );
}
