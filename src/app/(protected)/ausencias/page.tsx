'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { useNovedadesPorEstado, useResolverHys } from '@/lib/api/novedades';
import type { EstadoHys } from '@/types/domain';

export default function AusenciasPage() {
  const [estado, setEstado] = useState<EstadoHys>('pendiente');
  const { data, isLoading } = useNovedadesPorEstado(estado);
  const resolver = useResolverHys();

  async function resolverHys(id: number, estadoHys: 'aprobada' | 'desaprobada') {
    try {
      await resolver.mutateAsync({ id, estadoHys });
      toast.success(estadoHys === 'aprobada' ? 'Ausencia aprobada' : 'Ausencia desaprobada');
    } catch {
      toast.error('No se pudo resolver');
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Higiene y Seguridad"
        title="Ausencias"
        action={
          <label className="text-sm text-slate">
            Estado{' '}
            <select
              aria-label="Estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoHys)}
              className="rounded-md border border-line bg-surface px-2 py-1 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="pendiente">Pendientes</option>
              <option value="aprobada">Aprobadas</option>
              <option value="desaprobada">Desaprobadas</option>
            </select>
          </label>
        }
      />

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          Sin novedades en este estado.
        </p>
      ) : (
        <div className="rounded-xl border border-line bg-surface divide-y divide-line">
          {(data ?? []).map((n) => (
            <div key={n.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="font-medium text-ink">{n.operario.apellido_nombre}</span>
              <span className="text-slate">{n.tipoNovedad.nombre}</span>
              <span className="tabular-nums text-slate">
                {n.fechaInicio.slice(0, 10)}
                {n.fechaFin ? ` → ${n.fechaFin.slice(0, 10)}` : ''}
              </span>
              {n.justificacionTexto && <span className="text-slate">{n.justificacionTexto}</span>}
              <StatusBadge estado={n.estadoHys} />
              {estado === 'pendiente' && (
                <span className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => resolverHys(n.id, 'aprobada')}
                    className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-ink transition hover:brightness-95"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => resolverHys(n.id, 'desaprobada')}
                    className="rounded-md border border-danger px-3 py-1 text-xs text-danger transition hover:bg-danger/10"
                  >
                    Desaprobar
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
