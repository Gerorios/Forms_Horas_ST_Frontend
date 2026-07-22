'use client';

import { useMemo, useState } from 'react';
import { usePorAprobar } from '@/lib/api/aprobaciones';
import { agruparPorLote } from '@/lib/agrupar';
import { LoteCard } from '@/features/aprobaciones/lote-card';
import { LoteResueltoCard } from '@/features/aprobaciones/lote-resuelto-card';
import { QuincenaSelect } from '@/features/mis-registros/quincena-select';
import { quincenaDeFecha, enQuincena, type Quincena } from '@/lib/quincena';
import { PageHeader } from '@/components/page-header';
import type { EstadoRegistro } from '@/types/domain';

type Tab = Extract<EstadoRegistro, 'pendiente' | 'aprobado' | 'desaprobado'>;

const TABS: { value: Tab; label: string }[] = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'desaprobado', label: 'Rechazados' },
];

export default function AprobacionesPage() {
  const [tab, setTab] = useState<Tab>('pendiente');
  const [quincena, setQuincena] = useState<Quincena>(() => quincenaDeFecha(new Date()));

  const { data, isLoading } = usePorAprobar(tab);

  // Pendientes es siempre una cola chica (lo no resuelto); aprobados/rechazados
  // se acumulan indefinidamente con el uso, así que ahí sí acotamos por quincena.
  const filas = useMemo(
    () => (tab === 'pendiente' ? (data ?? []) : (data ?? []).filter((f) => enQuincena(f.fecha, quincena))),
    [data, tab, quincena],
  );
  const grupos = useMemo(() => agruparPorLote(filas), [filas]);

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Jefe de contrato" title="Aprobaciones" />

      <div className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === t.value
                ? 'border-brand font-medium text-ink'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'pendiente' && <QuincenaSelect value={quincena} onChange={setQuincena} />}

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          {tab === 'pendiente' ? 'No hay registros pendientes.' : 'No hay registros en esta quincena.'}
        </div>
      ) : tab === 'pendiente' ? (
        grupos.map((g) => <LoteCard key={g.loteId} grupo={g} />)
      ) : (
        grupos.map((g) => <LoteResueltoCard key={g.loteId} grupo={g} />)
      )}
    </section>
  );
}
