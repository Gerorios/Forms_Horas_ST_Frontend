'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth/session';
import { useMisRegistros, useCargasQueHice } from '@/lib/api/registros';
import { QuincenaSelect } from '@/features/mis-registros/quincena-select';
import { RegistrosTabla } from '@/features/mis-registros/registros-tabla';
import { quincenaDeFecha, type Quincena } from '@/lib/quincena';

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
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral">Mis registros</h1>

      {esJdC && (
        <div className="flex gap-2 border-b border-neutral/20">
          <button
            type="button"
            onClick={() => setTab('mias')}
            className={`px-3 py-2 text-sm ${tab === 'mias' ? 'border-b-2 border-brand text-brand' : 'text-neutral'}`}
          >
            Mis horas
          </button>
          <button
            type="button"
            onClick={() => setTab('cargadas')}
            className={`px-3 py-2 text-sm ${tab === 'cargadas' ? 'border-b-2 border-brand text-brand' : 'text-neutral'}`}
          >
            Cargas que hice
          </button>
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
