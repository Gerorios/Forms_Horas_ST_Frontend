'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { useRangosKm, useCrearRangoKm } from '@/lib/api/liquidacion';

export default function PorTantosPage() {
  const { data, isLoading } = useRangosKm();
  const crear = useCrearRangoKm();

  const [vigenteDesde, setVigenteDesde] = useState('');
  const [kmDesde, setKmDesde] = useState('');
  const [kmHasta, setKmHasta] = useState('');
  const [precioPorKm, setPrecioPorKm] = useState('');

  function agregar() {
    if (!vigenteDesde || !kmDesde || !precioPorKm) return;
    const promesa = crear.mutateAsync({
      vigenteDesde,
      kmDesde: Number(kmDesde),
      kmHasta: kmHasta ? Number(kmHasta) : undefined,
      precioPorKm: Number(precioPorKm),
    });
    toast.promise(promesa, { loading: 'Guardando…', success: 'Rango cargado', error: 'No se pudo cargar' });
    promesa.then(() => { setKmDesde(''); setKmHasta(''); setPrecioPorKm(''); }).catch(() => {});
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Por tantos (km)" />
      <p className="text-sm text-slate">
        Hoy solo aplica a relevamiento de fugas. Se paga todo el total de km de la quincena al precio
        del rango en el que cae (no progresivo). Dejá &quot;Km hasta&quot; vacío para el rango más alto,
        sin techo.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
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
          Km desde
          <input
            aria-label="Km desde"
            type="number"
            step="0.01"
            value={kmDesde}
            onChange={(e) => setKmDesde(e.target.value)}
            className="mt-1 w-24 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-slate">
          Km hasta (opcional)
          <input
            aria-label="Km hasta"
            type="number"
            step="0.01"
            value={kmHasta}
            onChange={(e) => setKmHasta(e.target.value)}
            className="mt-1 w-24 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-slate">
          Precio por km
          <input
            aria-label="Precio por km"
            type="number"
            step="0.01"
            value={precioPorKm}
            onChange={(e) => setPrecioPorKm(e.target.value)}
            className="mt-1 w-28 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <button
          type="button"
          disabled={crear.isPending}
          onClick={agregar}
          className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
        >
          Guardar
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {(data ?? []).map((r) => (
            <li key={r.id} className="px-4 py-2.5 text-sm text-ink">
              Desde {r.vigenteDesde.slice(0, 10)}: {r.kmDesde} a {r.kmHasta ?? '∞'} km →{' '}
              <span className="tabular-nums">${r.precioPorKm}/km</span>
            </li>
          ))}
          {(data ?? []).length === 0 && <li className="px-4 py-2.5 text-sm text-slate">Sin rangos cargados.</li>}
        </ul>
      )}
    </section>
  );
}
