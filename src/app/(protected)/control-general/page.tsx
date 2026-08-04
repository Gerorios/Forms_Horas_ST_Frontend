'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { QuincenaSelect } from '@/features/mis-registros/quincena-select';
import { useResumenOperarios, useSinCarga } from '@/lib/api/panel-general';
import { quincenaDeFecha, quincenaAnterior, type Quincena } from '@/lib/quincena';

type FiltroTile = 'todos' | 'extra' | 'pendientes';

function StatTile({
  label,
  value,
  tono,
  activo,
  onClick,
}: {
  label: string;
  value: number;
  /** Colorea el número solo cuando hay algo que atender (value > 0) — un 0 no es una alerta. */
  tono?: 'warn' | 'danger';
  activo?: boolean;
  onClick?: () => void;
}) {
  const colorValor =
    tono === 'warn' && value > 0
      ? 'text-warn'
      : tono === 'danger' && value > 0
        ? 'text-danger'
        : 'text-ink';
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        activo ? 'border-brand ring-2 ring-brand/30' : 'border-line hover:border-brand/40'
      } bg-surface`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${colorValor}`}>{value}</p>
    </button>
  );
}

function BuscarInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar por nombre…"
      className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
    />
  );
}

export default function ControlGeneralPage() {
  const [quincena, setQuincena] = useState<Quincena>(() => quincenaAnterior(quincenaDeFecha(new Date())));
  const [busquedaResumen, setBusquedaResumen] = useState('');
  const [busquedaSinCarga, setBusquedaSinCarga] = useState('');
  const [filtroTile, setFiltroTile] = useState<FiltroTile>('todos');
  const sinCargaRef = useRef<HTMLDivElement>(null);

  const { data: resumen, isLoading: cargandoResumen } = useResumenOperarios(quincena);
  const { data: sinCarga, isLoading: cargandoSinCarga } = useSinCarga(quincena);

  function alternarFiltro(tile: FiltroTile) {
    setFiltroTile((prev) => (prev === tile ? 'todos' : tile));
  }

  function irASinCarga() {
    sinCargaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Lo que necesita revisión sube primero: horas extra, después filas
  // pendientes, y recién ahí por total de horas — así no hay que escanear
  // toda la tabla para encontrar los casos que importan. El filtro de tile
  // (clic en un stat tile) y la búsqueda por nombre se combinan (AND).
  const resumenOrdenado = useMemo(() => {
    const term = busquedaResumen.trim().toLowerCase();
    return [...(resumen ?? [])]
      .filter((r) => term === '' || r.apellido_nombre.toLowerCase().includes(term))
      .filter((r) => {
        if (filtroTile === 'extra') return r.superaHorasExtra;
        if (filtroTile === 'pendientes') return r.pendiente > 0;
        return true;
      })
      .sort((a, b) => {
        // deltaHorasAprobadas queda fuera de "necesita atención": casi todos
        // tienen algo de variación natural quincena a quincena, así que
        // ordenar/resaltar por eso sería ruido — se muestra como dato en la
        // columna para que el jefe lo lea, sin forzarlo arriba de todo.
        const necesitaA = a.superaHorasExtra || a.tieneAlertaCruzada;
        const necesitaB = b.superaHorasExtra || b.tieneAlertaCruzada;
        if (necesitaA !== necesitaB) return necesitaA ? -1 : 1;
        if (a.pendiente !== b.pendiente) return b.pendiente - a.pendiente;
        return b.totalHoras - a.totalHoras;
      });
  }, [resumen, busquedaResumen, filtroTile]);

  // Quien tenía carga y dejó de reportar de repente es más urgente que quien
  // nunca cargó nada (probablemente recién ingresado, sin contrato asignado
  // todavía) — esos últimos quedan al final.
  const sinCargaFiltrado = useMemo(() => {
    const term = busquedaSinCarga.trim().toLowerCase();
    return [...(sinCarga ?? [])]
      .filter((e) => term === '' || e.apellido_nombre.toLowerCase().includes(term))
      .sort((a, b) => {
        if (a.ultimaCarga === b.ultimaCarga) return 0;
        if (a.ultimaCarga === null) return 1;
        if (b.ultimaCarga === null) return -1;
        return b.ultimaCarga.localeCompare(a.ultimaCarga);
      });
  }, [sinCarga, busquedaSinCarga]);

  const conHorasExtra = (resumen ?? []).filter((r) => r.superaHorasExtra).length;
  const filasPendientes = (resumen ?? []).reduce((s, r) => s + r.pendiente, 0);

  const ETIQUETA_FILTRO: Record<FiltroTile, string> = {
    todos: '',
    extra: 'Filtrando por horas extra',
    pendientes: 'Filtrando por pendientes',
  };

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Jefe de contrato" title="Control general" />
      <QuincenaSelect value={quincena} onChange={setQuincena} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Operarios con carga"
          value={(resumen ?? []).length}
          activo={filtroTile === 'todos'}
          onClick={() => setFiltroTile('todos')}
        />
        <StatTile
          label="Con horas extra (+88hs)"
          value={conHorasExtra}
          tono="warn"
          activo={filtroTile === 'extra'}
          onClick={() => alternarFiltro('extra')}
        />
        <StatTile
          label="Filas pendientes de revisar"
          value={filasPendientes}
          tono="warn"
          activo={filtroTile === 'pendientes'}
          onClick={() => alternarFiltro('pendientes')}
        />
        <StatTile label="Sin carga" value={(sinCarga ?? []).length} tono="danger" onClick={irASinCarga} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold text-ink">
            Resumen por operario (de mis contratos)
            {filtroTile !== 'todos' && (
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-brand-deep">
                {ETIQUETA_FILTRO[filtroTile]}
                <button
                  type="button"
                  aria-label="Quitar filtro"
                  onClick={() => setFiltroTile('todos')}
                  className="ml-1.5 text-brand-deep/70 hover:text-brand-deep"
                >
                  ×
                </button>
              </span>
            )}
          </h2>
          <BuscarInput value={busquedaResumen} onChange={setBusquedaResumen} label="Buscar operario" />
        </div>
        {cargandoResumen ? (
          <p className="text-slate">Cargando…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-2.5 font-medium">Operario</th>
                  <th className="px-4 py-2.5 font-medium">Total hs</th>
                  <th className="px-4 py-2.5 font-medium">Pendiente</th>
                  <th className="px-4 py-2.5 font-medium">Aprobado</th>
                  <th className="px-4 py-2.5 font-medium">Rechazado</th>
                  <th className="px-4 py-2.5 font-medium">Extra</th>
                  <th className="px-4 py-2.5 font-medium">Cruzado</th>
                  <th className="px-4 py-2.5 font-medium">Δ aprobadas</th>
                </tr>
              </thead>
              <tbody>
                {resumenOrdenado.map((r) => (
                  <tr
                    key={r.cuil}
                    className={`border-b border-line text-ink last:border-0 ${
                      r.superaHorasExtra || r.tieneAlertaCruzada ? 'bg-warn/5' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/aprobaciones?operarioCuil=${r.cuil}`}
                        className="underline decoration-line hover:text-brand-deep hover:decoration-brand-deep"
                        title="Ver los registros de este operario en Aprobaciones"
                      >
                        {r.apellido_nombre}
                      </Link>
                    </td>
                    <td className="tabular-nums px-4 py-2.5">{r.totalHoras}</td>
                    <td className="tabular-nums px-4 py-2.5">{r.pendiente}</td>
                    <td className="tabular-nums px-4 py-2.5">{r.aprobado}</td>
                    <td className="tabular-nums px-4 py-2.5">{r.desaprobado}</td>
                    <td className="px-4 py-2.5">
                      {r.superaHorasExtra && (
                        <span
                          className="rounded bg-warn/10 px-1 text-xs font-medium text-warn"
                          title="Supera las 88hs de la quincena (umbral de hora extra, ver ADR-009)"
                        >
                          +88hs
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.tieneAlertaCruzada && (
                        <span
                          className="rounded bg-warn/10 px-1 text-xs font-medium text-warn"
                          title="Algún día de la quincena tuvo horas en más de un lote, o ≥16hs entre todos los contratos"
                        >
                          ⚠ cruzado
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums px-4 py-2.5">
                      <span
                        className={r.deltaHorasAprobadas > 0 ? 'font-medium text-warn' : 'text-slate'}
                        title={`${r.horasAprobadas}hs esta quincena vs ${r.horasAprobadasAnterior}hs la anterior`}
                      >
                        {r.deltaHorasAprobadas > 0 ? '+' : ''}
                        {r.deltaHorasAprobadas}hs
                      </span>
                      {r.horasAprobadasAnterior === 0 && r.horasAprobadas > 0 && (
                        <span className="ml-1 text-xs italic text-slate">(nuevo)</span>
                      )}
                    </td>
                  </tr>
                ))}
                {resumenOrdenado.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-3 text-sm text-slate">
                      {(resumen ?? []).length === 0
                        ? 'Sin registros en esta quincena.'
                        : 'Nadie coincide con el filtro/búsqueda actual.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div ref={sinCargaRef} className="space-y-3 scroll-mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold text-ink">Sin carga en esta quincena</h2>
          <BuscarInput value={busquedaSinCarga} onChange={setBusquedaSinCarga} label="Buscar empleado sin carga" />
        </div>
        <p className="text-xs text-slate">
          Empleados activos sin ningún registro de horas en el período — puede ser una omisión, o
          alguien que trabajó bajo otro contrato. Compartido entre todos los Jefes de Contrato y
          Admin, no está limitado a tus contratos.
        </p>
        {cargandoSinCarga ? (
          <p className="text-slate">Cargando…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-2.5 font-medium">Empleado</th>
                  <th className="px-4 py-2.5 font-medium">Legajo</th>
                  <th className="px-4 py-2.5 font-medium">Cargo</th>
                  <th className="px-4 py-2.5 font-medium">Última carga</th>
                </tr>
              </thead>
              <tbody>
                {sinCargaFiltrado.map((e) => (
                  <tr key={e.cuil} className="border-b border-line text-ink last:border-0">
                    <td className="px-4 py-2.5">{e.apellido_nombre}</td>
                    <td className="px-4 py-2.5">{e.legajo}</td>
                    <td className="px-4 py-2.5">{e.cargo}</td>
                    <td className="px-4 py-2.5">
                      {e.ultimaCarga ?? (
                        <span className="text-xs italic text-slate">Nunca</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sinCargaFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm text-slate">
                      {(sinCarga ?? []).length === 0
                        ? 'Todos los empleados activos tienen carga en esta quincena.'
                        : 'Sin empleados que coincidan con la búsqueda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
