'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { PageHeader } from '@/components/page-header';
import { FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import { TableSkeleton, TilesSkeleton } from '@/components/skeleton';
import {
  useResumenCert,
  useEstadoCargas,
  usePresupuesto,
  useIncidenciaMo,
} from '@/lib/api/certificaciones';
import { calcularIncidencia, semaforo, type Semaforo } from '@/features/certificaciones/resumen/incidencia';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_OPCIONES = NOMBRES_MES.map((nombre, i) => ({ value: i + 1, label: nombre }));

const SEMAFORO_LABEL: Record<Semaforo, string> = { ok: 'OK', alerta: 'Alerta', excedido: 'Excedido' };
const SEMAFORO_CLASE: Record<Semaforo, string> = {
  ok: 'bg-approved/10 text-approved ring-approved/25',
  alerta: 'bg-warn/10 text-warn ring-warn/25',
  excedido: 'bg-danger/10 text-danger ring-danger/25',
};

function SemaforoBadge({ pct }: { pct: number }) {
  const s = semaforo(pct);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SEMAFORO_CLASE[s]}`}
    >
      {SEMAFORO_LABEL[s]}
    </span>
  );
}

function fmtMoneda(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function fmtPct(n: number): string {
  return `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs tabular-nums text-slate">{sub}</p>}
    </div>
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

export default function CertificacionesPage() {
  const { perfil } = useSession();
  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const periodo = `${anio}-${String(mes).padStart(2, '0')}`;

  const { data: resumen, isLoading: cargandoResumen } = useResumenCert(periodo);
  const { data: estadoCargas, isLoading: cargandoEstado } = useEstadoCargas(periodo);
  const { data: presupuesto, isError: errorPresupuesto } = usePresupuesto();

  // La incidencia MO solo se calcula si el usuario tiene el claim (admin/lectura
  // siempre, 'carga' solo con `inc`) — ver Task 4/brief.
  const muestraIncidencia = perfil?.cert != null && (perfil.cert.inc || perfil.cert.nivel !== 'carga');
  const { data: incidenciaMo } = useIncidenciaMo(anio, mes, muestraIncidencia);

  const certificadoPorK = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const fila of resumen ?? []) {
      acc[fila.contrato] = (acc[fila.contrato] ?? 0) + fila.monto_total;
    }
    return acc;
  }, [resumen]);

  const moPorK = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const c of incidenciaMo?.contratos ?? []) acc[c.codigo] = c.montoMo;
    return acc;
  }, [incidenciaMo]);

  const filasIncidencia = useMemo(
    () => calcularIncidencia(certificadoPorK, moPorK),
    [certificadoPorK, moPorK],
  );

  const totalCertificado = (resumen ?? []).reduce((acc, f) => acc + f.monto_total, 0);
  const totalLineas = (resumen ?? []).reduce((acc, f) => acc + f.lineas, 0);
  const contratosCertificaron = (estadoCargas ?? []).filter((c) => c.cargado).length;
  const contratosFaltantes = (estadoCargas ?? []).filter((c) => !c.cargado).length;

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Certificaciones" title="Resumen de certificaciones" />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <FiltroSelect
          label="Mes"
          value={mes}
          onChange={(v) => setMes(Number(v))}
          opciones={MESES_OPCIONES}
          opcional={false}
        />
        <FiltroNumero label="Año" value={anio} onChange={(v) => setAnio(Number(v) || anio)} className="w-24" />
      </div>

      {cargandoResumen || cargandoEstado ? (
        <TilesSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Total certificado del período" value={fmtMoneda(totalCertificado)} />
          <StatTile label="Líneas certificadas" value={String(totalLineas)} />
          <StatTile label="Contratos que certificaron" value={String(contratosCertificaron)} />
          <StatTile
            label="Contratos faltantes"
            value={String(contratosFaltantes)}
            sub={contratosFaltantes > 0 ? 'Sin carga en el período' : undefined}
          />
        </div>
      )}

      {presupuesto && !errorPresupuesto && (
        <Card titulo="Presupuesto por contrato">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Presupuesto por contrato">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-3 py-2.5 font-medium">Contrato</th>
                  <th className="px-3 py-2.5 font-medium">Descripción</th>
                  <th className="px-3 py-2.5 text-right font-medium">Presupuesto</th>
                  <th className="px-3 py-2.5 text-right font-medium">Consumido</th>
                  <th className="px-3 py-2.5 text-right font-medium">% ejecutado</th>
                </tr>
              </thead>
              <tbody>
                {presupuesto.map((p) => (
                  <tr key={p.contrato} className="border-b border-line text-ink last:border-0">
                    <td className="px-3 py-2.5">{p.contrato}</td>
                    <td className="px-3 py-2.5 text-slate">{p.descripcion}</td>
                    <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(p.monto_presupuesto)}</td>
                    <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(p.consumido)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          p.pct > 100
                            ? 'bg-danger/10 text-danger ring-danger/25'
                            : p.pct > 80
                              ? 'bg-warn/10 text-warn ring-warn/25'
                              : 'bg-approved/10 text-approved ring-approved/25'
                        }`}
                      >
                        {fmtPct(p.pct)}
                      </span>
                    </td>
                  </tr>
                ))}
                {presupuesto.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-sm text-slate">
                      Sin presupuesto cargado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {muestraIncidencia && (
        <Card titulo="Incidencia de mano de obra por contrato">
          {cargandoResumen ? (
            <TableSkeleton rows={4} cols={4} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Incidencia de mano de obra por contrato">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                    <th className="px-3 py-2.5 font-medium">Contrato</th>
                    <th className="px-3 py-2.5 text-right font-medium">Certificado</th>
                    <th className="px-3 py-2.5 text-right font-medium">MO imputada</th>
                    <th className="px-3 py-2.5 text-right font-medium">% incidencia</th>
                    <th className="px-3 py-2.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filasIncidencia.map((f) => (
                    <tr key={f.codigo} className="border-b border-line text-ink last:border-0">
                      <td className="px-3 py-2.5">{f.codigo}</td>
                      <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(f.certificado)}</td>
                      <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(f.mo)}</td>
                      <td className="tabular-nums px-3 py-2.5 text-right">
                        {f.pct === null ? '—' : fmtPct(f.pct)}
                      </td>
                      <td className="px-3 py-2.5">{f.pct !== null && <SemaforoBadge pct={f.pct} />}</td>
                    </tr>
                  ))}
                  {filasIncidencia.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-sm text-slate">
                        Sin datos de incidencia para este período.
                      </td>
                    </tr>
                  )}
                  {incidenciaMo?.sinAsignar !== null && incidenciaMo?.sinAsignar !== undefined && (
                    <tr className="text-ink">
                      <td className="px-3 py-2.5 italic text-slate">Sin contrato asignable</td>
                      <td className="px-3 py-2.5" />
                      <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(incidenciaMo.sinAsignar)}</td>
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card titulo="Detalle por contrato y tipo">
        {cargandoResumen ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Detalle de certificaciones por contrato">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-3 py-2.5 font-medium">Contrato</th>
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 text-right font-medium">Líneas</th>
                  <th className="px-3 py-2.5 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {(resumen ?? []).map((f, i) => (
                  <tr key={`${f.contrato}-${f.tipo}-${i}`} className="border-b border-line text-ink last:border-0">
                    <td className="px-3 py-2.5">{f.contrato}</td>
                    <td className="px-3 py-2.5 text-slate">{f.tipo}</td>
                    <td className="tabular-nums px-3 py-2.5 text-right">{f.lineas}</td>
                    <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(f.monto_total)}</td>
                  </tr>
                ))}
                {(resumen ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-sm text-slate">
                      Sin certificaciones cargadas para este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
