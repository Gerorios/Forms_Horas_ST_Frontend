'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useResolverLote, useCorregirLote } from '@/lib/api/aprobaciones';
import { DesaprobarDialog } from './desaprobar-dialog';
import { CorregirHorasDialog } from './corregir-horas-dialog';
import { ResumenCarga } from '@/components/resumen-carga';
import type { GrupoContrato, GrupoLote } from '@/lib/agrupar';

export function LoteCard({ grupo }: { grupo: GrupoLote }) {
  const resolverLote = useResolverLote();
  const corregirLote = useCorregirLote();
  const [expandido, setExpandido] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(
    () => new Set(grupo.accionables.map((f) => f.id)),
  );
  const [desaprobando, setDesaprobando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<GrupoContrato | null>(null);

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

  function confirmarCorreccion(horasCorregidas: number, motivo: string) {
    if (!corrigiendo) return;
    setCorrigiendo(null);
    toast.promise(
      corregirLote.mutateAsync({
        loteId: grupo.loteId,
        contratoId: corrigiendo.contrato.id,
        horasCorregidas,
        motivo,
      }),
      {
        loading: 'Corrigiendo…',
        success: 'Horas corregidas y aprobadas',
        error: 'No se pudo corregir',
      },
    );
  }

  const puedeConfirmar = !expandido || seleccionados.size > 0;
  const etiqueta = expandido ? `seleccionados (${seleccionados.size})` : 'todo';

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-surface ${grupo.alertas ? 'border-warn/60' : 'border-line'}`}
    >
      <ResumenCarga grupo={grupo} />

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
          {grupo.contratos.map((c) => (
            <div key={c.contrato.id} className={c.accionable ? '' : 'bg-sand/60'}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <span className="font-medium text-ink">{c.contrato.codigo}</span>
                <span className="tabular-nums text-ink">{c.subtotalHoras} hs</span>
                <span className="text-slate">{c.tareas.join(', ') || '—'}</span>
                {c.accionable ? (
                  <button
                    type="button"
                    onClick={() => setCorrigiendo(c)}
                    className="ml-auto rounded-md border border-line px-2.5 py-1 text-xs font-medium text-slate transition hover:bg-accent/60"
                  >
                    Corregir horas
                  </button>
                ) : (
                  <span className="ml-auto text-xs italic text-slate/70">otro contrato</span>
                )}
              </div>
              {c.observacion && (
                <p className="px-4 pb-2.5 text-xs text-slate">
                  <span className="font-medium text-ink">Observación:</span> {c.observacion}
                </p>
              )}
              <div className="divide-y divide-line/60 border-t border-line/60">
                {c.filas.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 pr-4 pl-8 text-sm"
                  >
                    {f.accionable && (
                      <input
                        type="checkbox"
                        aria-label={`Incluir a ${f.operario.apellido_nombre}`}
                        checked={seleccionados.has(f.id)}
                        onChange={() => toggleSeleccion(f.id)}
                      />
                    )}
                    <span className={f.accionable ? 'font-medium text-ink' : 'text-slate'}>
                      {f.operario.apellido_nombre}
                    </span>
                    <span>
                      <span className="tabular-nums text-ink">{f.horas}</span> hs
                      {f.totalHorasDia >= 16 && (
                        <span
                          className="ml-1 rounded bg-warn/10 px-1 text-xs font-medium text-warn"
                          title="Total real de horas de este operario ese día, sumando todos los contratos"
                        >
                          {f.totalHorasDia}hs ese día
                        </span>
                      )}
                      {f.duplicadoCruzado && (
                        <span
                          className="ml-1 rounded bg-danger/10 px-1 text-xs font-medium text-danger"
                          title="Este operario tiene carga en otro contrato/lote ese mismo día — coordiná con el otro jefe de contrato antes de aprobar"
                        >
                          ⚠ otro contrato el mismo día
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {desaprobando && (
        <DesaprobarDialog onCancel={() => setDesaprobando(false)} onConfirm={confirmarDesaprobar} />
      )}

      {corrigiendo && (
        <CorregirHorasDialog
          horasActuales={corrigiendo.subtotalHoras}
          onCancel={() => setCorrigiendo(null)}
          onConfirm={confirmarCorreccion}
        />
      )}
    </div>
  );
}
