'use client';

import { useState } from 'react';
import { useNovedades } from '@/lib/api/novedades';
import { NuevaNovedadForm } from '@/features/novedades/nueva-novedad-form';

const CHIP: Record<string, string> = {
  no_aplica: 'bg-neutral/15 text-neutral',
  pendiente: 'bg-neutral/15 text-neutral',
  aprobada: 'bg-green-100 text-green-800',
  desaprobada: 'bg-alert/15 text-alert',
};

export default function NovedadesPage() {
  const { data, isLoading } = useNovedades();
  const [mostrarForm, setMostrarForm] = useState(true);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral">Novedades</h1>
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded bg-brand px-3 py-2 text-sm font-medium text-white"
        >
          {mostrarForm ? 'Cerrar' : 'Nueva novedad'}
        </button>
      </div>

      {mostrarForm && <NuevaNovedadForm onCreada={() => setMostrarForm(false)} />}

      {isLoading ? (
        <p className="text-neutral">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-neutral/60">Sin novedades.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral/20 text-left text-neutral/70">
                <th className="py-2">Operario</th>
                <th>Tipo</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th>Estado HyS</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((n) => (
                <tr key={n.id} className="border-b border-neutral/10">
                  <td className="py-2">{n.operario.apellido_nombre}</td>
                  <td>{n.tipoNovedad.nombre}</td>
                  <td>{n.fechaInicio.slice(0, 10)}</td>
                  <td>{n.fechaFin ? n.fechaFin.slice(0, 10) : '—'}</td>
                  <td>
                    <span className={`rounded px-2 py-0.5 text-xs ${CHIP[n.estadoHys] ?? ''}`}>
                      {n.estadoHys}
                    </span>
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
