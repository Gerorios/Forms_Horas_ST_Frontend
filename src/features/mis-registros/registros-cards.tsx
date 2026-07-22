'use client';

import { useMemo } from 'react';
import { enQuincena, type Quincena } from '@/lib/quincena';
import { StatusBadge } from '@/components/status-badge';
import type { RegistroHoras } from '@/types/domain';

export function RegistrosCards({
  registros,
  quincena,
  isLoading,
}: {
  registros: RegistroHoras[] | undefined;
  quincena: Quincena;
  isLoading: boolean;
}) {
  const filtrados = useMemo(
    () => (registros ?? []).filter((r) => enQuincena(r.fecha, quincena)),
    [registros, quincena],
  );
  const total = useMemo(
    // Lo desaprobado no cuenta como hora a cobrar: fue rechazado.
    () =>
      filtrados
        .filter((r) => r.estado !== 'desaprobado')
        .reduce((s, r) => s + Number(r.horas), 0),
    [filtrados],
  );

  if (isLoading) return <p className="text-slate">Cargando…</p>;
  if (filtrados.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
        Sin registros en esta quincena.
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-brand p-5 text-center">
        <div className="text-xs font-medium uppercase tracking-wide text-ink/70">
          Total {quincena.parte === 1 ? '1ª' : '2ª'} quincena
        </div>
        <div className="text-4xl font-extrabold tabular-nums text-ink">{total} hs</div>
      </div>

      <div className="space-y-2">
        {filtrados.map((r) => (
          <div key={r.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-ink">{r.fecha.slice(0, 10)}</div>
                <div className="text-sm text-slate">
                  <span>{r.contrato.codigo}</span> · {r.tareas.map((t) => t.tarea.nombre).join(', ') || '—'}
                </div>
                {r.moviles.length > 0 && (
                  <div className="text-xs text-slate/70">
                    {r.moviles.map((m) => m.movil.identificador).join(', ')}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums text-ink">
                  {r.horas} hs
                  {r.alertaHoras && (
                    <span className="ml-1 rounded bg-warn/10 px-1 text-xs font-medium text-warn">+16h</span>
                  )}
                </div>
                <StatusBadge estado={r.estado} />
              </div>
            </div>
            {r.estado === 'desaprobado' && r.motivoDesaprobacion && (
              <p className="mt-2 text-xs text-danger">Motivo: {r.motivoDesaprobacion}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
