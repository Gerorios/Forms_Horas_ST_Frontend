'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { QuincenaSelect } from '@/features/mis-registros/quincena-select';
import { useResumenOperarios, useSinCarga } from '@/lib/api/panel-general';
import { quincenaDeFecha, quincenaAnterior, type Quincena } from '@/lib/quincena';

export default function ControlGeneralPage() {
  const [quincena, setQuincena] = useState<Quincena>(() => quincenaAnterior(quincenaDeFecha(new Date())));

  const { data: resumen, isLoading: cargandoResumen } = useResumenOperarios(quincena);
  const { data: sinCarga, isLoading: cargandoSinCarga } = useSinCarga(quincena);

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Jefe de contrato" title="Control general" />
      <QuincenaSelect value={quincena} onChange={setQuincena} />

      <div className="space-y-3">
        <h2 className="font-display text-sm font-semibold text-ink">
          Resumen por operario (de mis contratos)
        </h2>
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
                </tr>
              </thead>
              <tbody>
                {(resumen ?? []).map((r) => (
                  <tr key={r.cuil} className="border-b border-line text-ink last:border-0">
                    <td className="px-4 py-2.5">{r.apellido_nombre}</td>
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
                  </tr>
                ))}
                {(resumen ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm text-slate">
                      Sin registros en esta quincena.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-sm font-semibold text-ink">
          Sin carga en esta quincena
        </h2>
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
                </tr>
              </thead>
              <tbody>
                {(sinCarga ?? []).map((e) => (
                  <tr key={e.cuil} className="border-b border-line text-ink last:border-0">
                    <td className="px-4 py-2.5">{e.apellido_nombre}</td>
                    <td className="px-4 py-2.5">{e.legajo}</td>
                    <td className="px-4 py-2.5">{e.cargo}</td>
                  </tr>
                ))}
                {(sinCarga ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm text-slate">
                      Todos los empleados activos tienen carga en esta quincena.
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
