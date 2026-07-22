'use client';

import { useState } from 'react';
import { ResumenCarga } from './resumen-carga';
import { StatusBadge } from './status-badge';
import type { GrupoLote } from '@/lib/agrupar';

export function LoteResumenCard({
  grupo,
  mostrarEstado = false,
  onReabrir,
  reabrirPending = false,
}: {
  grupo: GrupoLote;
  /** Muestra el estado (pendiente/aprobado/desaprobado) de cada fila individual.
   * Útil cuando un mismo lote puede mezclar estados (ej. "cargas que hice"). */
  mostrarEstado?: boolean;
  /** Si se pasa, agrega un botón "Reabrir" en las filas accionables. */
  onReabrir?: (id: number, nombre: string) => void;
  reabrirPending?: boolean;
}) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <ResumenCarga grupo={grupo} />

      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60"
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
                {!c.accionable && (
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
                    <span className={f.accionable ? 'font-medium text-ink' : 'text-slate'}>
                      {f.operario.apellido_nombre}
                    </span>
                    <span>
                      <span className="tabular-nums text-ink">{f.horas}</span> hs
                      {f.alertaHoras && (
                        <span className="ml-1 rounded bg-warn/10 px-1 text-xs font-medium text-warn">
                          +16h
                        </span>
                      )}
                    </span>
                    {mostrarEstado && <StatusBadge estado={f.estado} />}
                    {f.motivoDesaprobacion && (
                      <span className="text-xs text-danger">Motivo: {f.motivoDesaprobacion}</span>
                    )}
                    {onReabrir && f.accionable && (
                      <button
                        type="button"
                        disabled={reabrirPending}
                        onClick={() => onReabrir(f.id, f.operario.apellido_nombre)}
                        className="ml-auto rounded-md border border-line px-2.5 py-1 text-xs font-medium text-slate transition hover:bg-accent/60 disabled:opacity-50"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
