'use client';

import type { FilaDetalleEmpleado, ModalidadPago } from '@/lib/api/liquidacion';
import { formatMoney } from './fila-empleado';

const MODALIDAD_LABEL: Record<ModalidadPago, string> = {
  en_b: 'En B',
  con_descuentos: 'Con descuentos',
};

export function DetalleEmpleado({
  fila,
  contratosDestacados = [],
}: {
  fila: FilaDetalleEmpleado;
  contratosDestacados?: string[];
}) {
  return (
    <div className="space-y-4 text-sm text-ink" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate">
        <span>
          Modalidad de pago:{' '}
          <span className="text-ink">
            {fila.modalidadPago ? (MODALIDAD_LABEL[fila.modalidadPago] ?? fila.modalidadPago) : '—'}
          </span>
        </span>
        <span>
          Novedades: <span className="text-ink">{fila.etiquetaNovedades || '—'}</span>
        </span>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">Días aprobados</h3>
        {contratosDestacados.length > 0 && (
          <p className="mb-1 text-xs text-slate">
            Los importes son de la quincena completa, no del contrato filtrado.
          </p>
        )}
        {fila.dias.length === 0 ? (
          <p className="text-xs text-slate">Sin días aprobados en el período.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left uppercase tracking-wide text-slate">
                  <th className="px-2 py-1.5 font-medium">Fecha</th>
                  <th className="px-2 py-1.5 font-medium">Contrato</th>
                  <th className="px-2 py-1.5 font-medium">Tareas</th>
                  <th className="px-2 py-1.5 font-medium">Horas</th>
                  <th className="px-2 py-1.5 font-medium">Cargado por</th>
                  <th className="px-2 py-1.5 font-medium">Importe est.</th>
                </tr>
              </thead>
              <tbody>
                {fila.dias.map((d, i) => (
                  <tr
                    key={`${d.fecha}-${d.contratoCodigo}-${i}`}
                    className={`border-b border-line/60 last:border-0 ${
                      contratosDestacados.includes(d.contratoCodigo) ? 'bg-brand/10' : ''
                    }`}
                  >
                    <td className="px-2 py-1.5">{d.fecha}</td>
                    <td className="px-2 py-1.5">{d.contratoCodigo}</td>
                    <td className="px-2 py-1.5">{d.tareas.join(', ') || '—'}</td>
                    <td className="px-2 py-1.5 tabular-nums">{d.horas}</td>
                    <td className="px-2 py-1.5">{d.cargadoPor}</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {d.importeEstimado != null ? formatMoney(d.importeEstimado) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">Novedades del período</h3>
        {fila.novedades.length === 0 ? (
          <p className="text-xs text-slate">Sin novedades en el período.</p>
        ) : (
          <ul className="list-inside list-disc text-xs text-ink">
            {fila.novedades.map((n, i) => (
              <li key={`${n.tipo}-${n.desde}-${i}`}>
                {n.tipo} ({n.desde} a {n.hasta}) — <span className="text-slate">{n.efecto}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
