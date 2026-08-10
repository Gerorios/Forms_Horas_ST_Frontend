'use client';

import { useState } from 'react';
import { PreciosVigentesTab } from '@/features/liquidacion/precios-vigentes-tab';
import { SueldosMensualizadosTab } from '@/features/liquidacion/sueldos-mensualizados-tab';

const TABS = [
  { id: 'precios', label: 'Precios' },
  { id: 'sueldos', label: 'Sueldos mensualizados' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TarifasPage() {
  const [tab, setTab] = useState<TabId>('precios');

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === t.id ? 'border-brand font-medium text-ink' : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'precios' ? <PreciosVigentesTab /> : <SueldosMensualizadosTab />}
    </div>
  );
}
