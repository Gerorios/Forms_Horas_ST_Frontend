'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import Link from 'next/link';
import {
  useCalculoQuincena,
  useMontosMensualizados,
  useCargarMontosMensualizados,
  useKmPorTantos,
  useCargarKmPorTantos,
  useAlertasQuincena,
  type RegimenLiquidacion,
} from '@/lib/api/liquidacion';

const REGIMEN_LABEL: Record<RegimenLiquidacion, string> = {
  jornalizado: 'Jornalizado',
  fijo: 'Fijo',
  mensualizado: 'Mensualizado',
  por_tantos: 'Por tantos',
  administrativo: 'Administrativo',
};

function formatMoney(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
}

function hoyISO() {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1, quincena: hoy.getDate() <= 15 ? 1 : 2 };
}

export default function CalculoQuincenaPage() {
  const inicial = hoyISO();
  const [anio, setAnio] = useState(inicial.anio);
  const [mes, setMes] = useState(inicial.mes);
  const [quincena, setQuincena] = useState<1 | 2>(inicial.quincena as 1 | 2);

  const { data: montosMensualizados } = useMontosMensualizados(anio, mes, quincena);
  const cargarMontos = useCargarMontosMensualizados();
  const { data: kmsPorTantos } = useKmPorTantos(anio, mes, quincena);
  const cargarKms = useCargarKmPorTantos();
  const { data: calculo, isLoading } = useCalculoQuincena(anio, mes, quincena);
  const { data: alertas } = useAlertasQuincena(anio, mes, quincena);

  const [montoEdits, setMontoEdits] = useState<Record<string, string>>({});
  const [kmEdits, setKmEdits] = useState<Record<string, string>>({});

  // Los edits se resincronizan solo cuando cambia la quincena elegida, no en
  // cada refetch de la misma quincena (evita pisar lo que se está tipeando).
  const clavePeriodo = `${anio}-${mes}-${quincena}`;
  const montosSyncKey = useRef('');
  useEffect(() => {
    if (!montosMensualizados || montosSyncKey.current === clavePeriodo) return;
    montosSyncKey.current = clavePeriodo;
    setMontoEdits(Object.fromEntries(montosMensualizados.map((m) => [m.cuil, m.monto ?? ''])));
  }, [montosMensualizados, clavePeriodo]);

  const kmsSyncKey = useRef('');
  useEffect(() => {
    if (!kmsPorTantos || kmsSyncKey.current === clavePeriodo) return;
    kmsSyncKey.current = clavePeriodo;
    setKmEdits(Object.fromEntries(kmsPorTantos.map((k) => [k.cuil, k.kmTotal ?? ''])));
  }, [kmsPorTantos, clavePeriodo]);

  function guardarMontos() {
    const montos = Object.entries(montoEdits)
      .filter(([, v]) => v !== '')
      .map(([cuil, v]) => ({ cuil, monto: Number(v) }));
    if (!montos.length) return;
    toast.promise(cargarMontos.mutateAsync({ anio, mes, quincena, montos }), {
      loading: 'Guardando montos…',
      success: 'Montos guardados',
      error: 'No se pudo guardar',
    });
  }

  function guardarKms() {
    const kms = Object.entries(kmEdits)
      .filter(([, v]) => v !== '')
      .map(([cuil, v]) => ({ cuil, kmTotal: Number(v) }));
    if (!kms.length) return;
    toast.promise(cargarKms.mutateAsync({ anio, mes, quincena, kms }), {
      loading: 'Guardando km…',
      success: 'Km guardados',
      error: 'No se pudo guardar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Liquidar quincena" />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
        <label className="flex flex-col text-xs font-medium text-slate">
          Año
          <input
            aria-label="Año"
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="mt-1 w-24 rounded-md border border-line bg-surface px-2 py-1.5 text-sm tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-slate">
          Mes
          <select
            aria-label="Mes"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-slate">
          Quincena
          <select
            aria-label="Quincena"
            value={quincena}
            onChange={(e) => setQuincena(Number(e.target.value) as 1 | 2)}
            className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value={1}>1ra (1 al 15)</option>
            <option value={2}>2da (16 a fin de mes)</option>
          </select>
        </label>
      </div>

      {alertas &&
        (alertas.sinPerfil.length > 0 || alertas.perfilIncompleto.length > 0 || alertas.sinHorasAprobadas.length > 0) && (
          <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <h2 className="font-display text-sm font-semibold">Alertas antes de liquidar</h2>

            {alertas.sinPerfil.length > 0 && (
              <div>
                <p className="font-medium">Tienen horas cargadas pero no tienen perfil de liquidación asignado:</p>
                <ul className="mt-1 list-inside list-disc">
                  {alertas.sinPerfil.map((e) => (
                    <li key={e.cuil}>
                      {e.apellidoNombre} — {e.horasAprobadas.toFixed(2)}hs aprobadas
                      {e.horasPendientes > 0 ? `, ${e.horasPendientes.toFixed(2)}hs pendientes` : ''}
                    </li>
                  ))}
                </ul>
                <Link href="/liquidacion/perfiles" className="mt-1 inline-block underline">
                  Ir a Perfiles de empleados →
                </Link>
              </div>
            )}

            {alertas.perfilIncompleto.length > 0 && (
              <div>
                <p className="font-medium">Perfiles incompletos (falta categoría y/o modalidad de pago):</p>
                <ul className="mt-1 list-inside list-disc">
                  {alertas.perfilIncompleto.map((e) => (
                    <li key={e.cuil}>
                      {e.apellidoNombre} ({REGIMEN_LABEL[e.regimen]}) — falta{' '}
                      {[e.faltaCategoria && 'categoría', e.faltaModalidad && 'modalidad de pago']
                        .filter(Boolean)
                        .join(' y ')}
                    </li>
                  ))}
                </ul>
                <Link href="/liquidacion/perfiles" className="mt-1 inline-block underline">
                  Ir a Perfiles de empleados →
                </Link>
              </div>
            )}

            {alertas.sinHorasAprobadas.length > 0 && (
              <div>
                <p className="font-medium">Jornalizados sin horas aprobadas en esta quincena:</p>
                <ul className="mt-1 list-inside list-disc">
                  {alertas.sinHorasAprobadas.map((e) => (
                    <li key={e.cuil}>
                      {e.apellidoNombre} —{' '}
                      {e.motivo === 'pendientes'
                        ? `tiene ${e.horasPendientes.toFixed(2)}hs cargadas sin aprobar`
                        : 'nunca declaró horas en el período'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      {(montosMensualizados ?? []).length > 0 && (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
          <h2 className="font-display text-sm font-semibold text-ink">Montos mensualizados de esta quincena</h2>
          {(montosMensualizados ?? []).map((m) => (
            <label key={m.cuil} className="flex items-center justify-between gap-3 text-sm text-ink">
              {m.apellidoNombre}
              <input
                aria-label={`Monto — ${m.apellidoNombre}`}
                type="number"
                step="0.01"
                value={montoEdits[m.cuil] ?? ''}
                onChange={(e) => setMontoEdits((prev) => ({ ...prev, [m.cuil]: e.target.value }))}
                className="w-32 rounded-md border border-line bg-surface px-2 py-1.5 text-right tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={guardarMontos}
            disabled={cargarMontos.isPending}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            Guardar montos
          </button>
        </div>
      )}

      {(kmsPorTantos ?? []).length > 0 && (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
          <h2 className="font-display text-sm font-semibold text-ink">Km de esta quincena (por tantos)</h2>
          {(kmsPorTantos ?? []).map((k) => (
            <label key={k.cuil} className="flex items-center justify-between gap-3 text-sm text-ink">
              {k.apellidoNombre}
              <input
                aria-label={`Km — ${k.apellidoNombre}`}
                type="number"
                step="0.01"
                value={kmEdits[k.cuil] ?? ''}
                onChange={(e) => setKmEdits((prev) => ({ ...prev, [k.cuil]: e.target.value }))}
                className="w-32 rounded-md border border-line bg-surface px-2 py-1.5 text-right tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={guardarKms}
            disabled={cargarKms.isPending}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            Guardar km
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-slate">Calculando…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-3 py-2.5 font-medium">Empleado</th>
                <th className="px-3 py-2.5 font-medium">Categoría</th>
                <th className="px-3 py-2.5 font-medium">Régimen</th>
                <th className="px-3 py-2.5 font-medium">Provincia</th>
                <th className="px-3 py-2.5 font-medium">Hs Total</th>
                <th className="px-3 py-2.5 font-medium">Hs CCT</th>
                <th className="px-3 py-2.5 font-medium">Precio Bruto</th>
                <th className="px-3 py-2.5 font-medium">Total Bruto</th>
                <th className="px-3 py-2.5 font-medium">Hs Extra</th>
                <th className="px-3 py-2.5 font-medium">$ Hs Extra</th>
                <th className="px-3 py-2.5 font-medium">Presentismo</th>
                <th className="px-3 py-2.5 font-medium">Plus novedades</th>
                <th className="px-3 py-2.5 font-medium">No remunerativo</th>
                <th className="px-3 py-2.5 font-medium">Novedades</th>
                <th className="px-3 py-2.5 font-medium">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {(calculo ?? []).map((r) => {
                const totalPlus = r.plus.reduce((s, p) => s + p.monto, 0);
                return (
                  <tr key={r.cuil} className="border-b border-line text-ink last:border-0">
                    <td className="px-3 py-2.5">{r.apellidoNombre}</td>
                    <td className="px-3 py-2.5">{r.categoria ?? '—'}</td>
                    <td className="px-3 py-2.5">{REGIMEN_LABEL[r.regimen]}</td>
                    <td className="px-3 py-2.5">{r.provincia}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.horasTotal.toFixed(2)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.horasCct.toFixed(2)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.precioBruto != null ? formatMoney(r.precioBruto) : '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums">{formatMoney(r.totalBruto)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.horasExtra > 0 ? r.horasExtra.toFixed(2) : '-'}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.montoHorasExtra > 0 ? formatMoney(r.montoHorasExtra) : '$-'}</td>
                    <td className="px-3 py-2.5">
                      {r.tienePresentismo ? `SI ${formatMoney(r.montoPresentismo)}` : 'NO'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{totalPlus > 0 ? formatMoney(totalPlus) : '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.noRemunerativo > 0 ? formatMoney(r.noRemunerativo) : '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate">{r.novedadesTexto || '—'}</td>
                    <td className="px-3 py-2.5 font-medium tabular-nums">{formatMoney(r.total)}</td>
                  </tr>
                );
              })}
              {(calculo ?? []).length === 0 && (
                <tr>
                  <td colSpan={15} className="px-3 py-3 text-sm text-slate">
                    Sin empleados con perfil de liquidación asignado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(calculo ?? []).some((r) => r.datoFaltante) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Faltan datos para calcular a algunos empleados:</p>
          <ul className="mt-1 list-inside list-disc">
            {(calculo ?? [])
              .filter((r) => r.datoFaltante)
              .map((r) => (
                <li key={r.cuil}>{r.apellidoNombre}: {r.datoFaltante}</li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
