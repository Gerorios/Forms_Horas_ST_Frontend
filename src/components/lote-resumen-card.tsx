'use client';

import { useState } from 'react';
import { ResumenCarga } from './resumen-carga';
import { StatusBadge } from './status-badge';
import type { GrupoLote } from '@/lib/agrupar';
import type { InfoCorreccion } from '@/lib/correccion';

function InfoCorreccionTexto({
  info,
  horasActuales,
}: {
  info: InfoCorreccion | null | undefined;
  horasActuales: number;
}) {
  if (!info) return null;
  if (info.tipo === 'reemplazada') {
    return (
      <p className="px-4 pb-2.5 text-xs font-medium text-approved">
        Reemplazada por una corrección: <span className="tabular-nums">{info.nueva.horas}</span> hs
      </p>
    );
  }
  return (
    <div className="px-4 pb-2.5">
      <p className="text-xs font-medium text-approved">
        Corregido de{' '}
        <span className="tabular-nums text-slate/60 line-through">{info.original.horas}</span> a{' '}
        <span className="tabular-nums">{horasActuales}</span> hs
      </p>
      {info.original.motivoDesaprobacion && (
        <p className="mt-0.5 text-xs text-slate">Motivo: {info.original.motivoDesaprobacion}</p>
      )}
    </div>
  );
}

export function LoteResumenCard({
  grupo,
  mostrarEstado = false,
  onReabrir,
  reabrirPending = false,
  infoCorreccionPorContrato,
}: {
  grupo: GrupoLote;
  /** Muestra el estado (pendiente/aprobado/desaprobado) de cada fila individual.
   * Útil cuando un mismo lote puede mezclar estados (ej. "cargas que hice"). */
  mostrarEstado?: boolean;
  /** Si se pasa, agrega un botón "Reabrir" en las filas accionables. */
  onReabrir?: (id: number, nombre: string) => void;
  reabrirPending?: boolean;
  /** Relación de corrección (ver ADR-006) de cada contrato de este lote,
   * calculada por quien renderiza (necesita ver todos los lotes a la vez). */
  infoCorreccionPorContrato?: Record<number, InfoCorreccion | null>;
}) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-surface ${grupo.alertas ? 'border-warn/60' : 'border-line'}`}
    >
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
              <InfoCorreccionTexto
                info={infoCorreccionPorContrato?.[c.contrato.id]}
                horasActuales={c.subtotalHoras}
              />
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
                      {f.totalHorasDia !== null && f.totalHorasDia >= 16 && (
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
                          title="Registro duplicado exacto: otra carga idéntica (mismas horas, contrato, tareas y móviles) ese mismo día — revisá antes de aprobar"
                        >
                          ⚠ posible duplicado
                        </span>
                      )}
                    </span>
                    {mostrarEstado && <StatusBadge estado={f.estado} />}
                    {f.aprobadoPor && (
                      <span className="text-xs text-slate">
                        {f.estado === 'desaprobado' ? 'Rechazado' : 'Aprobado'} por{' '}
                        {f.aprobadoPor.nombre}
                        {f.aprobadoEn && ` el ${new Date(f.aprobadoEn).toLocaleString('es-AR')}`}
                      </span>
                    )}
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
