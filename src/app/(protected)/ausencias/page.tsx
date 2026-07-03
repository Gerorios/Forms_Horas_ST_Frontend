'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral">Ausencias (HyS)</h1>
        <label className="text-sm text-neutral">
          Estado{' '}
          <select
            aria-label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoHys)}
            className="rounded border border-neutral/40 px-2 py-1"
          >
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="desaprobada">Desaprobadas</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="text-neutral">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-neutral/60">Sin novedades en este estado.</p>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((n) => (
            <div key={n.id} className="flex flex-wrap items-center gap-3 rounded border border-neutral/20 p-3 text-sm">
              <span className="font-medium text-neutral">{n.operario.apellido_nombre}</span>
              <span>{n.tipoNovedad.nombre}</span>
              <span>{n.fechaInicio.slice(0, 10)}{n.fechaFin ? ` → ${n.fechaFin.slice(0, 10)}` : ''}</span>
              {n.justificacionTexto && <span className="text-neutral/60">{n.justificacionTexto}</span>}
              {estado === 'pendiente' && (
                <span className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => resolverHys(n.id, 'aprobada')}
                    className="rounded bg-brand px-2 py-1 text-xs font-medium text-white"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => resolverHys(n.id, 'desaprobada')}
                    className="rounded border border-alert px-2 py-1 text-xs text-alert"
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
