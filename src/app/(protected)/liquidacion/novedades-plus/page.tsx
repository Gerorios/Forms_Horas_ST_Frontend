'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { useTiposNovedadAdmin } from '@/lib/api/admin';
import { useMontosNovedadPlus, useCrearMontoNovedadPlus } from '@/lib/api/liquidacion';

export default function NovedadesPlusPage() {
  const { data: tipos } = useTiposNovedadAdmin();
  const { data: montos, isLoading } = useMontosNovedadPlus();
  const crear = useCrearMontoNovedadPlus();

  const [montoAbierto, setMontoAbierto] = useState<number | null>(null);
  const [vigenteDesde, setVigenteDesde] = useState('');
  const [montoPorDia, setMontoPorDia] = useState('');

  const tiposConPlus = (tipos ?? []).filter((t) => t.generaPlus);

  function agregar(tipoNovedadId: number) {
    if (!vigenteDesde || !montoPorDia) return;
    const promesa = crear.mutateAsync({ tipoNovedadId, vigenteDesde, montoPorDia: Number(montoPorDia) });
    toast.promise(promesa, { loading: 'Guardando…', success: 'Monto cargado', error: 'No se pudo cargar' });
    promesa.then(() => { setVigenteDesde(''); setMontoPorDia(''); setMontoAbierto(null); }).catch(() => {});
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Novedades con plus" />
      <p className="text-sm text-slate">
        Solo aparecen acá los tipos de novedad marcados como &quot;genera plus&quot; en Admin → Tipos de
        novedad. Cada día de esa novedad en la quincena suma este monto.
      </p>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <ul className="space-y-2">
          {tiposConPlus.map((t) => {
            const montosTipo = (montos ?? []).filter((m) => m.tipoNovedadId === t.id);
            return (
              <li key={t.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{t.nombre}</span>
                  <button
                    type="button"
                    onClick={() => setMontoAbierto(montoAbierto === t.id ? null : t.id)}
                    className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-accent/50"
                  >
                    + Monto
                  </button>
                </div>

                {montoAbierto === t.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-accent/30 p-3">
                    <label className="flex flex-col text-xs font-medium text-slate">
                      Vigente desde
                      <input
                        aria-label="Vigente desde"
                        type="date"
                        value={vigenteDesde}
                        onChange={(e) => setVigenteDesde(e.target.value)}
                        className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                      />
                    </label>
                    <label className="flex flex-col text-xs font-medium text-slate">
                      Monto por día
                      <input
                        aria-label="Monto por día"
                        type="number"
                        step="0.01"
                        value={montoPorDia}
                        onChange={(e) => setMontoPorDia(e.target.value)}
                        className="mt-1 w-32 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={crear.isPending}
                      onClick={() => agregar(t.id)}
                      className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {montosTipo.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-slate">
                    {montosTipo.map((m) => (
                      <li key={m.id}>
                        Desde {m.vigenteDesde.slice(0, 10)}: <span className="tabular-nums text-ink">${m.montoPorDia}</span>/día
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          {tiposConPlus.length === 0 && (
            <li className="text-sm text-slate">
              No hay tipos de novedad marcados como &quot;genera plus&quot; todavía.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
