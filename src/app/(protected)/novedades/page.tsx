'use client';

import { useState } from 'react';
import { useNovedades } from '@/lib/api/novedades';
import { NuevaNovedadForm } from '@/features/novedades/nueva-novedad-form';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';

export default function NovedadesPage() {
  const { data, isLoading } = useNovedades();
  const [mostrarForm, setMostrarForm] = useState(false);

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Supervisor"
        title="Novedades"
        action={
          <button
            type="button"
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            {mostrarForm ? 'Cerrar' : 'Nueva novedad'}
          </button>
        }
      />

      {mostrarForm && <NuevaNovedadForm onCreada={() => setMostrarForm(false)} />}

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          Sin novedades.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-2.5 font-medium">Operario</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Desde</th>
                <th className="px-4 py-2.5 font-medium">Hasta</th>
                <th className="px-4 py-2.5 font-medium">Estado HyS</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((n) => (
                <tr key={n.id} className="border-b border-line text-ink last:border-0">
                  <td className="px-4 py-2.5">{n.operario.apellido_nombre}</td>
                  <td className="px-4 py-2.5">{n.tipoNovedad.nombre}</td>
                  <td className="px-4 py-2.5 tabular-nums">{n.fechaInicio.slice(0, 10)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{n.fechaFin ? n.fechaFin.slice(0, 10) : '—'}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge estado={n.estadoHys} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
