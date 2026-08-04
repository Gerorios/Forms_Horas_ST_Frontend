'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useQuincenas, type EstadoQuincena, type QuincenaResumen } from '@/lib/api/liquidacion';

const ESTADO_CHIP: Record<
  EstadoQuincena,
  { icon: string; cls: string; texto: (q: QuincenaResumen) => string }
> = {
  con_pendientes: {
    icon: '🔴',
    cls: 'bg-danger/10 text-danger ring-danger/25',
    texto: (q) => `Con pendientes — ${q.pendientes} sin aprobar`,
  },
  con_alertas: {
    icon: '🟡',
    cls: 'bg-warn/10 text-warn ring-warn/25',
    texto: (q) => `Con alertas — ${q.alertas}`,
  },
  lista: {
    icon: '🟢',
    cls: 'bg-approved/10 text-approved ring-approved/25',
    texto: () => 'Lista para liquidar',
  },
};

function nombreQuincena(q: QuincenaResumen) {
  const mes = new Date(2000, q.mes - 1, 1).toLocaleDateString('es-AR', { month: 'long' });
  return `${q.quincena === 1 ? '1ra' : '2da'} de ${mes} ${q.anio}`;
}

export default function QuincenasPage() {
  const { data, isLoading } = useQuincenas();

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Liquidador" title="Quincenas" />

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-2.5 font-medium">Quincena</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((q) => {
                const chip = ESTADO_CHIP[q.estado];
                return (
                  <tr
                    key={`${q.anio}-${q.mes}-${q.quincena}`}
                    className="border-b border-line text-ink last:border-0"
                  >
                    <td className="px-4 py-2.5">{nombreQuincena(q)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${chip.cls}`}
                      >
                        <span aria-hidden="true">{chip.icon}</span>
                        {chip.texto(q)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/liquidacion/quincena/detalle?anio=${q.anio}&mes=${q.mes}&q=${q.quincena}`}
                        className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm text-slate">
                    Sin quincenas para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
