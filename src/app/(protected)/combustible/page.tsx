'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth/session';
import { useMoviles } from '@/lib/api/catalogos';
import { useCargasCombustible, type FiltroCargas } from '@/lib/api/combustible';
import { DetalleCarga } from '@/features/combustible/detalle-carga';
import { StatusBadge } from '@/components/status-badge';
import { PageHeader } from '@/components/page-header';
import { BarraFiltros, FiltroFecha, MultiFiltro } from '@/components/ui/barra-filtros';
import { opcionesFacetadas } from '@/lib/facetado';
import { TableSkeleton } from '@/components/skeleton';

const ESTADO_LABEL: Record<'activa' | 'anulada', string> = { activa: 'Activas', anulada: 'Anuladas' };

export default function CombustiblePage() {
  const { perfil } = useSession();
  const { data: moviles } = useMoviles();

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [movilIds, setMovilIds] = useState<string[]>([]);
  // Por defecto solo se ven las activas — mismo comportamiento que antes,
  // ahora expresado como "Activas" tildado en el MultiFiltro.
  const [estados, setEstados] = useState<string[]>(['activa']);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  // Móvil/Estado se filtran en cliente (multi-selección); las fechas siguen
  // yendo server-side como antes.
  const filtro: FiltroCargas = useMemo(
    () => ({
      desde: desde || undefined,
      hasta: hasta || undefined,
    }),
    [desde, hasta],
  );

  const { data: cargasSinFiltrarPorCategoria, isLoading } = useCargasCombustible(filtro);

  const cargas = useMemo(
    () =>
      (cargasSinFiltrarPorCategoria ?? []).filter(
        (c) =>
          (movilIds.length === 0 || movilIds.includes(String(c.movil.id))) &&
          (estados.length === 0 || estados.includes(c.estado)),
      ),
    [cargasSinFiltrarPorCategoria, movilIds, estados],
  );

  const opcionesMovil = useMemo(() => {
    const base = opcionesFacetadas(
      (cargasSinFiltrarPorCategoria ?? []).filter((c) => estados.length === 0 || estados.includes(c.estado)),
      (c) => String(c.movil.id),
      movilIds,
    );
    const countPorId = new Map(base.map((o) => [o.value, o.count]));
    return (moviles ?? []).map((m) => ({
      value: String(m.id),
      label: m.identificador,
      count: countPorId.get(String(m.id)) ?? 0,
    }));
  }, [cargasSinFiltrarPorCategoria, moviles, estados, movilIds]);

  const opcionesEstado = useMemo(
    () =>
      opcionesFacetadas(
        (cargasSinFiltrarPorCategoria ?? []).filter((c) => movilIds.length === 0 || movilIds.includes(String(c.movil.id))),
        (c) => c.estado,
        estados,
        { labelDe: (v) => ESTADO_LABEL[v as 'activa' | 'anulada'] ?? v },
      ),
    [cargasSinFiltrarPorCategoria, movilIds, estados],
  );

  const hayFiltros = desde !== '' || hasta !== '' || movilIds.length > 0 || !(estados.length === 1 && estados[0] === 'activa');
  function limpiarFiltros() {
    setDesde('');
    setHasta('');
    setMovilIds([]);
    setEstados(['activa']);
  }

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

      <BarraFiltros hayFiltros={hayFiltros} onLimpiar={limpiarFiltros}>
        <FiltroFecha label="Desde" value={desde} onChange={setDesde} />
        <FiltroFecha label="Hasta" value={hasta} onChange={setHasta} />
        <MultiFiltro label="Móvil" opciones={opcionesMovil} seleccionados={movilIds} onChange={setMovilIds} />
        <MultiFiltro label="Estado" opciones={opcionesEstado} seleccionados={estados} onChange={setEstados} />
      </BarraFiltros>

      {isLoading ? (
        <TableSkeleton rows={5} cols={9} />
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
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDetalleId(c.id);
                      }
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
