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

  return (
    <div className="space-y-3">
      <p className="font-medium text-ink">{reporte.estado === 'pendiente' ? 'Calificar' : 'Recalificar'}</p>
      <div className="space-y-1.5">
        <p className="text-sm text-slate">
          {esInspeccion ? 'Puntos a restar a cada persona observada (0 a 10)' : 'Puntaje (0 a 10)'}
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
                puntaje === n ? 'border-2 border-graphite bg-graphite text-white' : 'border border-line bg-surface text-ink hover:bg-accent/60'
              }`}
            >
              {n}
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
        <Button
          variant="primary"
          disabled={ocupado || puntaje == null}
          onClick={() => enviar('aprobar')}
        >
          {puntaje == null ? 'Elegí un puntaje' : esInspeccion ? `Aprobar y restar ${puntaje}` : `Aprobar con ${puntaje}`}
        </Button>
      </div>
      {(reporte.estado === 'aprobado' || reporte.estado === 'desaprobado') && (
        <Button variant="secondary" disabled={ocupado} onClick={reabrirReporte} className="w-full">
          Reabrir (vuelve a pendiente y se borran sus puntos)
        </Button>
      )}
      <p className="text-xs text-slate">
        Aprobado o desaprobado, el autor ya no lo puede editar; para que lo corrija, reabrilo.
      </p>
    </div>
  );
}
