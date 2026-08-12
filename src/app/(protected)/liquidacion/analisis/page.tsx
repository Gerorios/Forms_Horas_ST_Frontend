'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import { useAnalisisQuincena } from '@/lib/api/liquidacion';
import { quincenaAnterior, quincenaDeFecha } from '@/lib/quincena';
import { fmtMoneda, fmtPct } from '@/features/liquidacion/analisis/colores';
import { ComposicionPago } from '@/features/liquidacion/analisis/composicion-pago';
import { TopCobradores, claseDelta } from '@/features/liquidacion/analisis/top-cobradores';
import { ContratosChart } from '@/features/liquidacion/analisis/contratos-chart';
import { HistoricoChart } from '@/features/liquidacion/analisis/historico-chart';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_OPCIONES = NOMBRES_MES.map((nombre, i) => ({ value: i + 1, label: nombre }));
const QUINCENA_OPCIONES = [
  { value: 1, label: '1ª quincena' },
  { value: 2, label: '2ª quincena' },
];

/** Variante del StatTile de control-general para KPIs monetarios: valor ya
 * formateado + sub-línea de contexto (Δ vs quincena anterior). No clickeable. */
function StatTile({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs tabular-nums">{sub}</p>}
    </div>
  );
}

/** Sub-línea de delta contra la quincena anterior. Acá SUBIR es costo: la
 * suba va en rojo y la baja en verde (al revés de un KPI de ventas). */
function DeltaSub({ actual, anterior }: { actual: number; anterior: number | null }) {
  if (anterior === null || anterior === 0) return <span className="text-slate">—</span>;
  const pct = Math.round(((actual - anterior) / anterior) * 1000) / 10;
  if (pct === 0) return <span className="text-slate">= vs quincena anterior</span>;
  const sube = pct > 0;
  return (
    <span className={sube ? 'text-danger' : 'text-approved'}>
      {sube ? '▲ ' : '▼ '}
      {fmtPct(pct, true)} vs quincena anterior
    </span>
  );
}

function Card({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-semibold text-ink">{titulo}</h2>
      {children}
    </div>
  );
}

export default function AnalisisQuincenaPage() {
  // Arranca en la quincena ANTERIOR a la actual — la última cerrada, que es
  // la que se acaba de liquidar (mismo criterio que control-general).
  const inicial = useMemo(() => quincenaAnterior(quincenaDeFecha(new Date())), []);
  const [anio, setAnio] = useState(inicial.anio);
  const [mes, setMes] = useState(inicial.mes);
  const [quincena, setQuincena] = useState<number>(inicial.parte);
  const [busqueda, setBusqueda] = useState('');

  const { data, isLoading } = useAnalisisQuincena(anio, mes, quincena);

  const variacionesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return data?.variaciones ?? [];
    return (data?.variaciones ?? []).filter((v) => v.nombre.toLowerCase().includes(texto));
  }, [data, busqueda]);

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Liquidación" title="Análisis de la quincena" />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <FiltroSelect
          label="Mes"
          value={mes}
          onChange={(v) => setMes(Number(v))}
          opciones={MESES_OPCIONES}
          opcional={false}
        />
        <FiltroNumero label="Año" value={anio} onChange={(v) => setAnio(Number(v) || anio)} className="w-24" />
        <FiltroSelect
          label="Quincena"
          value={quincena}
          onChange={(v) => setQuincena(Number(v))}
          opciones={QUINCENA_OPCIONES}
          opcional={false}
        />
      </div>

      {isLoading || !data ? (
        <p className="text-slate">Cargando…</p>
      ) : data.totales.empleados === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          Sin liquidación calculada para esta quincena.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Total de la quincena"
              value={fmtMoneda(data.totales.total)}
              sub={<DeltaSub actual={data.totales.total} anterior={data.anterior?.total ?? null} />}
            />
            <StatTile
              label="Empleados liquidados"
              value={String(data.totales.empleados)}
              sub={<span className="text-slate">{data.totales.empleadosNuevos} nuevos</span>}
            />
            <StatTile
              label="Horas pagadas"
              value={`${data.totales.horasCct.toLocaleString('es-AR')} CCT`}
              sub={<span className="text-warn">+ {data.totales.horasExtra.toLocaleString('es-AR')} extra</span>}
            />
            <StatTile
              label="Costo promedio por empleado"
              value={fmtMoneda(data.totales.costoPromedio)}
              sub={
                <DeltaSub
                  actual={data.totales.costoPromedio}
                  anterior={data.anterior?.costoPromedio ?? null}
                />
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card titulo="Composición del pago">
              <ComposicionPago composicion={data.composicion} />
            </Card>
            <Card titulo="Histórico (últimas 8 quincenas)">
              <HistoricoChart historico={data.historico} seleccionada={data.periodo} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card titulo="Top 10 cobradores">
              <TopCobradores cobradores={data.topCobradores} />
            </Card>
            <Card titulo="$ por contrato (prorrateo por horas)">
              <ContratosChart contratos={data.contratos} />
            </Card>
          </div>

          <Card titulo="Variaciones por persona">
            <label className="flex max-w-xs flex-col text-xs text-slate">
              Buscar por nombre
              <input
                aria-label="Buscar por nombre"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Apellido o nombre…"
                className="rounded border border-line px-2 py-1 text-sm text-ink"
              />
            </label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Variaciones por persona">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                    <th className="px-3 py-2.5 font-medium">Empleado</th>
                    <th className="px-3 py-2.5 font-medium">Régimen</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total anterior</th>
                    <th className="px-3 py-2.5 text-right font-medium">Δ$</th>
                    <th className="px-3 py-2.5 text-right font-medium">Δ%</th>
                    <th className="px-3 py-2.5 text-right font-medium">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {variacionesFiltradas.map((v) => (
                    <tr key={v.cuil} className="border-b border-line text-ink last:border-0">
                      <td className="px-3 py-2.5">{v.nombre}</td>
                      <td className="px-3 py-2.5 text-slate">{v.regimen}</td>
                      <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(v.total, 2)}</td>
                      <td className="tabular-nums px-3 py-2.5 text-right">
                        {v.totalAnterior === null ? '—' : fmtMoneda(v.totalAnterior, 2)}
                      </td>
                      <td className="tabular-nums px-3 py-2.5 text-right">
                        {v.deltaMonto === null ? '—' : fmtMoneda(v.deltaMonto, 2)}
                      </td>
                      <td className="tabular-nums px-3 py-2.5 text-right">
                        {v.deltaPct === null ? (
                          <span className="italic text-slate">(nuevo)</span>
                        ) : (
                          <span className={`font-medium ${claseDelta(v.deltaPct)}`}>
                            {fmtPct(v.deltaPct, true)}
                          </span>
                        )}
                      </td>
                      <td className="tabular-nums px-3 py-2.5 text-right">{v.diasTrabajados}</td>
                    </tr>
                  ))}
                  {variacionesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-3 text-sm text-slate">
                        Sin empleados que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </section>
  );
}
