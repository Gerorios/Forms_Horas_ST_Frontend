'use client';

import { useMemo } from 'react';
import { usePorAprobar } from '@/lib/api/aprobaciones';
import { agruparPorLote } from '@/lib/agrupar';
import { LoteCard } from '@/features/aprobaciones/lote-card';
import { PageHeader } from '@/components/page-header';

export default function AprobacionesPage() {
  const { data, isLoading } = usePorAprobar();
  // useMemo: agruparPorLote() arma arrays nuevos en cada llamada. Sin memoizar,
  // grupo.accionables cambiaría de referencia en cada render del padre y
  // resetearía la selección de checkboxes de LoteCard sin necesidad.
  const grupos = useMemo(() => agruparPorLote(data ?? []), [data]);

  if (isLoading) return <p className="text-slate">Cargando…</p>;

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Jefe de contrato" title="Aprobaciones" />
      {grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          No hay registros pendientes.
        </div>
      ) : (
        grupos.map((g) => <LoteCard key={g.loteId} grupo={g} />)
      )}
    </section>
  );
}
