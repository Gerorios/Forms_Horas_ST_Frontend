'use client';

import { useMemo } from 'react';
import { enQuincena, type Quincena } from '@/lib/quincena';
import { StatusBadge } from '@/components/status-badge';
import type { RegistroHoras } from '@/types/domain';

export function RegistrosTabla({
  registros,
  quincena,
  isLoading,
  mostrarOperario = false,
}: {
  registros: RegistroHoras[] | undefined;
  quincena: Quincena;
  isLoading: boolean;
  mostrarOperario?: boolean;
}) {
  const filtrados = useMemo(
    () => (registros ?? []).filter((r) => enQuincena(r.fecha, quincena)),
    [registros, quincena],
  );
  const total = useMemo(
    () => filtrados.reduce((s, r) => s + Number(r.horas), 0),
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
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              {mostrarOperario && <th className="px-4 py-2.5 font-medium">Operario</th>}
              <th className="px-4 py-2.5 font-medium">Contrato</th>
              <th className="px-4 py-2.5 font-medium">Tareas</th>
              <th className="px-4 py-2.5 font-medium">Horas</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Móviles</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 tabular-nums text-ink">{r.fecha.slice(0, 10)}</td>
                {mostrarOperario && <td className="px-4 py-2.5 text-ink">{r.operario.apellido_nombre}</td>}
                <td className="px-4 py-2.5 font-medium text-ink">{r.contrato.codigo}</td>
                <td className="px-4 py-2.5 text-slate">
                  {r.tareas.map((t) => t.tarea.nombre).join(', ') || '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className="tabular-nums text-ink">{r.horas}</span>
                  {r.alertaHoras && (
                    <span className="ml-1.5 rounded bg-warn/10 px-1 text-xs font-medium text-warn">+16h</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge estado={r.estado} />
                  {r.estado === 'desaprobado' && r.motivoDesaprobacion && (
                    <span className="ml-1 cursor-help text-xs text-danger" title={r.motivoDesaprobacion}>
                      (motivo)
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate">
                  {r.moviles.map((m) => m.movil.identificador).join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-4 py-2.5 text-sm text-slate">
        Total de la quincena: <strong className="tabular-nums text-ink">{total}</strong> hs
      </div>
    </div>
  );
}
