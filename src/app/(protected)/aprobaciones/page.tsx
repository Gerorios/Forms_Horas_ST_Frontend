'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { usePorAprobar, useResolverRegistro } from '@/lib/api/aprobaciones';
import { agruparPorOperarioFecha } from '@/lib/agrupar';
import { DesaprobarDialog } from '@/features/aprobaciones/desaprobar-dialog';
import { PageHeader } from '@/components/page-header';

export default function AprobacionesPage() {
  const { data, isLoading } = usePorAprobar();
  const resolver = useResolverRegistro();
  const [desaprobandoId, setDesaprobandoId] = useState<number | null>(null);

  const grupos = agruparPorOperarioFecha(data ?? []);

  async function aprobar(id: number) {
    try {
      await resolver.mutateAsync({ id, estado: 'aprobado' });
      toast.success('Registro aprobado');
    } catch {
      toast.error('No se pudo aprobar');
    }
  }

  async function confirmarDesaprobar(id: number, motivo: string) {
    try {
      await resolver.mutateAsync({ id, estado: 'desaprobado', motivoDesaprobacion: motivo });
      toast.success('Registro desaprobado');
    } catch {
      toast.error('No se pudo desaprobar');
    } finally {
      setDesaprobandoId(null);
    }
  }

  if (isLoading) return <p className="text-slate">Cargando…</p>;

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Jefe de contrato" title="Aprobaciones" />
      {grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          No hay registros pendientes.
        </div>
      ) : (
        grupos.map((g) => (
          <div
            key={`${g.operarioCuil}-${g.fecha}`}
            className="overflow-hidden rounded-xl border border-line bg-surface"
          >
            <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-ink">{g.operarioNombre}</h2>
              <span className="text-sm tabular-nums text-slate">{g.fecha}</span>
            </div>
            <div className="divide-y divide-line">
              {g.filas.map((f) => (
                <div
                  key={f.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-sm ${
                    f.accionable ? '' : 'bg-sand/60 text-slate'
                  }`}
                >
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
                  <span className="ml-auto flex gap-2">
                    {f.accionable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => aprobar(f.id)}
                          className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-ink transition hover:brightness-95"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDesaprobandoId(f.id)}
                          className="rounded-md border border-danger px-3 py-1 text-xs text-danger transition hover:bg-danger/10"
                        >
                          Desaprobar
                        </button>
                      </>
                    ) : (
                      <span className="text-xs italic text-slate/70">otro contrato</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {desaprobandoId != null && (
        <DesaprobarDialog
          onCancel={() => setDesaprobandoId(null)}
          onConfirm={(motivo) => confirmarDesaprobar(desaprobandoId, motivo)}
        />
      )}
    </section>
  );
}
