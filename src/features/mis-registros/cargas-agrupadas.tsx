'use client';

import { useMemo } from 'react';
import { agruparPorLote } from '@/lib/agrupar';
import { enQuincena, type Quincena } from '@/lib/quincena';
import { LoteResumenCard } from '@/components/lote-resumen-card';
import type { RegistroHoras } from '@/types/domain';

export function CargasAgrupadas({
  registros,
  quincena,
  isLoading,
}: {
  registros: RegistroHoras[] | undefined;
  quincena: Quincena;
  isLoading: boolean;
}) {
  const grupos = useMemo(() => {
    const filtrados = (registros ?? []).filter((r) => enQuincena(r.fecha, quincena));
    // "Cargas que hice" no distingue contratos propios/ajenos (ese concepto es
    // de aprobación, no aplica acá): se marcan todos accionable para que
    // agruparPorLote los muestre sin el atenuado de "otro contrato".
    return agruparPorLote(filtrados.map((r) => ({ ...r, accionable: true })));
  }, [registros, quincena]);

  const total = useMemo(() => grupos.reduce((s, g) => s + g.totalHoras, 0), [grupos]);

  if (isLoading) return <p className="text-slate">Cargando…</p>;
  if (grupos.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
        Sin cargas en esta quincena.
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

      <div className="space-y-4">
        {grupos.map((g) => (
          <LoteResumenCard key={g.loteId} grupo={g} mostrarEstado />
        ))}
      </div>
    </div>
  );
}
