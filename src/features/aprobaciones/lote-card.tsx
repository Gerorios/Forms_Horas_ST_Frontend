'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useResolverLote } from '@/lib/api/aprobaciones';
import { DesaprobarDialog } from './desaprobar-dialog';
import type { GrupoLote } from '@/lib/agrupar';

export function LoteCard({ grupo }: { grupo: GrupoLote }) {
  const resolverLote = useResolverLote();
  const [expandido, setExpandido] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(
    () => new Set(grupo.accionables.map((f) => f.id)),
  );
  const [desaprobando, setDesaprobando] = useState(false);

  // Reajusta la selección cuando cambia el grupo (patrón "adjust state during
  // rendering" de React: evita el efecto de setState síncrono en useEffect).
  const [accionablesPrevios, setAccionablesPrevios] = useState(grupo.accionables);
  if (grupo.accionables !== accionablesPrevios) {
    setAccionablesPrevios(grupo.accionables);
    setSeleccionados(new Set(grupo.accionables.map((f) => f.id)));
  }

  function toggleSeleccion(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function aprobar() {
    if (expandido && seleccionados.size === 0) return;
    const ids = expandido ? [...seleccionados] : undefined;
    toast.promise(resolverLote.mutateAsync({ loteId: grupo.loteId, estado: 'aprobado', ids }), {
      loading: 'Aprobando…',
      success: 'Carga aprobada',
      error: 'No se pudo aprobar',
    });
  }

  function confirmarDesaprobar(motivo: string) {
    setDesaprobando(false);
    const ids = expandido ? [...seleccionados] : undefined;
    toast.promise(
      resolverLote.mutateAsync({
        loteId: grupo.loteId,
        estado: 'desaprobado',
        ids,
        motivoDesaprobacion: motivo,
      }),
      { loading: 'Desaprobando…', success: 'Carga desaprobada', error: 'No se pudo desaprobar' },
    );
  }

  const puedeConfirmar = !expandido || seleccionados.size > 0;
  const etiqueta = expandido ? `seleccionados (${seleccionados.size})` : 'todo';

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-ink">
          {grupo.accionables.length} operario(s)
        </h2>
        <span className="text-sm tabular-nums text-slate">{grupo.fecha}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          disabled={resolverLote.isPending || !puedeConfirmar}
          onClick={aprobar}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
        >
          Aprobar {etiqueta}
        </button>
        <button
          type="button"
          disabled={resolverLote.isPending || !puedeConfirmar}
          onClick={() => setDesaprobando(true)}
          className="rounded-md border border-danger px-4 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
        >
          Desaprobar {etiqueta}
        </button>
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="ml-auto rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60"
        >
          {expandido ? 'Cerrar' : 'Ver detalle ▾'}
        </button>
      </div>

      {expandido && (
        <div className="divide-y divide-line">
          {grupo.filas.map((f) => (
            <div
              key={f.id}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-sm ${
                f.accionable ? '' : 'bg-sand/60 text-slate'
              }`}
            >
              {f.accionable && (
                <input
                  type="checkbox"
                  aria-label={`Incluir a ${f.operario.apellido_nombre}`}
                  checked={seleccionados.has(f.id)}
                  onChange={() => toggleSeleccion(f.id)}
                />
              )}
              <span className="font-medium text-ink">{f.operario.apellido_nombre}</span>
              <span className="font-medium text-ink">{f.contrato.codigo}</span>
              <span className={f.accionable ? 'text-slate' : ''}>
                {f.tareas.map((t) => t.tarea.nombre).join(', ') || '—'}
              </span>
              <span>
                <span className="tabular-nums text-ink">{f.horas}</span> hs
                {f.alertaHoras && (
                  <span className="ml-1 rounded bg-warn/10 px-1 text-xs font-medium text-warn">+16h</span>
                )}
              </span>
              {f.moviles.length > 0 && (
                <span className="text-slate">
                  {f.moviles.map((m) => m.movil.identificador).join(', ')}
                </span>
              )}
              {!f.accionable && (
                <span className="ml-auto text-xs italic text-slate/70">otro contrato</span>
              )}
            </div>
          ))}
        </div>
      )}

      {desaprobando && (
        <DesaprobarDialog onCancel={() => setDesaprobando(false)} onConfirm={confirmarDesaprobar} />
      )}
    </div>
  );
}
