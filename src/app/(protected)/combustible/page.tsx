'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth/session';
import { useMoviles } from '@/lib/api/catalogos';
import { useCargasCombustible, type FiltroCargas } from '@/lib/api/combustible';
import { DetalleCarga } from '@/features/combustible/detalle-carga';
import { StatusBadge } from '@/components/status-badge';
import { PageHeader } from '@/components/page-header';
import type { EstadoCargaCombustible } from '@/types/domain';

export default function CombustiblePage() {
  const { perfil } = useSession();
  const { data: moviles } = useMoviles();

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [movilId, setMovilId] = useState<number | ''>('');
  const [estado, setEstado] = useState<EstadoCargaCombustible | ''>('activa');
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const filtro: FiltroCargas = useMemo(
    () => ({
      desde: desde || undefined,
      hasta: hasta || undefined,
      movilId: movilId === '' ? undefined : movilId,
      estado: estado === '' ? undefined : estado,
    }),
    [desde, hasta, movilId, estado],
  );

  const { data: cargas, isLoading } = useCargasCombustible(filtro);

  const puedeCargar = perfil?.rol.nombre === 'JefeCuadrilla' || perfil?.rol.nombre === 'Admin';

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Combustible"
        title="Cargas de combustible"
        action={
          puedeCargar && (
            <Link
              href="/combustible/nueva"
              className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95"
            >
              Nueva carga
            </Link>
          )
        }
      />

      <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-4">
        <label className="flex flex-col text-sm font-medium text-ink">
          Desde
          <input
            aria-label="Desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-ink">
          Hasta
          <input
            aria-label="Hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-ink">
          Móvil
          <select
            aria-label="Móvil"
            value={movilId}
            onChange={(e) => setMovilId(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Todos</option>
            {(moviles ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.identificador}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm font-medium text-ink">
          Estado
          <select
            aria-label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoCargaCombustible | '')}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value="activa">Activas</option>
            <option value="anulada">Anuladas</option>
            <option value="">Todas</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Móvil</th>
                <th className="px-4 py-2.5 font-medium">Litros</th>
                <th className="px-4 py-2.5 font-medium">Monto</th>
                <th className="px-4 py-2.5 font-medium">Estación</th>
                <th className="px-4 py-2.5 font-medium">Combustible</th>
                <th className="px-4 py-2.5 font-medium">Contratos</th>
                <th className="px-4 py-2.5 font-medium">Cargado por</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(cargas ?? []).map((c) => {
                const contratos = [...new Set(c.tareas.map((t) => t.tarea.contrato.codigo))];
                return (
                  <tr
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetalleId(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setDetalleId(c.id);
                    }}
                    className="cursor-pointer border-b border-line text-ink last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-2.5">{c.fechaCarga.slice(0, 10)}</td>
                    <td className="px-4 py-2.5">{c.movil.identificador}</td>
                    <td className="px-4 py-2.5">{c.litros}</td>
                    <td className="px-4 py-2.5">{c.monto}</td>
                    <td className="px-4 py-2.5">{c.estacion.nombre}</td>
                    <td className="px-4 py-2.5">{c.tipoCombustible.nombre}</td>
                    <td className="px-4 py-2.5">{contratos.join(', ')}</td>
                    <td className="px-4 py-2.5">{c.cargadoPorCuil}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge estado={c.estado} />
                    </td>
                  </tr>
                );
              })}
              {(cargas ?? []).length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-3 text-sm text-slate">
                    Sin cargas que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detalleId !== null && <DetalleCarga id={detalleId} onClose={() => setDetalleId(null)} />}
    </section>
  );
}
