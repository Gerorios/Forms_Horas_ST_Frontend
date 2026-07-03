'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { usePorAprobar, useResolverRegistro } from '@/lib/api/aprobaciones';
import { agruparPorOperarioFecha } from '@/lib/agrupar';
import { DesaprobarDialog } from '@/features/aprobaciones/desaprobar-dialog';

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

  if (isLoading) return <p className="text-neutral">Cargando…</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral">Aprobaciones</h1>
      {grupos.length === 0 ? (
        <p className="text-neutral/60">No hay registros pendientes.</p>
      ) : (
        grupos.map((g) => (
          <div key={`${g.operarioCuil}-${g.fecha}`} className="rounded-lg border border-neutral/20 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-medium text-neutral">{g.operarioNombre}</h2>
              <span className="text-sm text-neutral/60">{g.fecha}</span>
            </div>
            <div className="space-y-2">
              {g.filas.map((f) => (
                <div
                  key={f.id}
                  className={`flex flex-wrap items-center gap-3 rounded border p-2 text-sm ${
                    f.accionable ? 'border-neutral/20' : 'border-neutral/10 bg-neutral/5 text-neutral/50'
                  }`}
                >
                  <span className="font-medium">{f.contrato.codigo}</span>
                  <span>{f.tarea.nombre}</span>
                  <span>
                    {f.horas} hs
                    {f.alertaHoras && <span className="ml-1 rounded bg-alert/15 px-1 text-xs text-alert">+16h</span>}
                  </span>
                  {f.moviles.length > 0 && (
                    <span className="text-neutral/60">
                      {f.moviles.map((m) => m.movil.identificador).join(', ')}
                    </span>
                  )}
                  <span className="ml-auto flex gap-2">
                    {f.accionable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => aprobar(f.id)}
                          className="rounded bg-brand px-2 py-1 text-xs font-medium text-white"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDesaprobandoId(f.id)}
                          className="rounded border border-alert px-2 py-1 text-xs text-alert"
                        >
                          Desaprobar
                        </button>
                      </>
                    ) : (
                      <span className="text-xs italic">otro contrato</span>
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
