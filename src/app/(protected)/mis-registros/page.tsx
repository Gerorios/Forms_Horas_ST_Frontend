'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth/session';
import { useMisRegistros, useCargasQueHice } from '@/lib/api/registros';
import { QuincenaSelect } from '@/features/mis-registros/quincena-select';
import { RegistrosTabla } from '@/features/mis-registros/registros-tabla';
import { quincenaDeFecha, type Quincena } from '@/lib/quincena';
import { PageHeader } from '@/components/page-header';

type Tab = 'mias' | 'cargadas';

export default function MisRegistrosPage() {
  const { perfil } = useSession();
  const cuil = perfil?.cuil ?? '';
  const esJdC = perfil?.rol?.nombre === 'JefeCuadrilla';

  const [q, setQ] = useState<Quincena>(() => quincenaDeFecha(new Date()));
  const [tab, setTab] = useState<Tab>('mias');

  const mias = useMisRegistros(cuil);
  const cargadas = useCargasQueHice(esJdC ? cuil : '');

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Historial" title="Mis registros" />

      {esJdC && (
        <div className="flex gap-1 border-b border-line">
          {(['mias', 'cargadas'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                tab === t
                  ? 'border-brand font-medium text-ink'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              {t === 'mias' ? 'Mis horas' : 'Cargas que hice'}
            </button>
          ))}
        </div>
      )}

      <QuincenaSelect value={q} onChange={setQ} />

      {esJdC && tab === 'cargadas' ? (
        <RegistrosTabla
          registros={cargadas.data}
          quincena={q}
          isLoading={cargadas.isLoading}
          mostrarOperario
        />
      ) : (
        <RegistrosTabla registros={mias.data} quincena={q} isLoading={mias.isLoading} />
      )}
    </section>
  );
}
