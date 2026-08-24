'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import { useSueldosMensualizados, useGuardarSueldosMensualizados, mensajeDeError } from '@/lib/api/liquidacion';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_OPCIONES = NOMBRES_MES.map((nombre, i) => ({ value: i + 1, label: nombre }));

function etiquetaMes(mes: number, anio: number) {
  return `${NOMBRES_MES[mes - 1]} ${anio}`;
}

/**
 * Sección propia dentro de Tarifas (ADR-016): el sueldo de un mensualizado es
 * "vigente" — se carga una vez por mes y aplica hacia adelante hasta el
 * próximo cambio (comparte el estado "mes resuelto" con la ronda de precios,
 * pero es una lista por persona, no un catálogo corto — vive en su propia
 * pestaña). Soporta edición 1x1 y un atajo de incremento por % que solo
 * prellena los campos, sin guardar hasta confirmar.
 */
export function SueldosMensualizadosTab() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [porcentaje, setPorcentaje] = useState('');

  const { data, isLoading } = useSueldosMensualizados(anio, mes);
  const guardar = useGuardarSueldosMensualizados();

  const [edits, setEdits] = useState<Record<string, string>>({});

  // Resincroniza solo cuando cambia el período elegido, no en cada refetch
  // de la misma quincena (mismo criterio que el resto del módulo).
  const clavePeriodo = `${anio}-${mes}`;
  const syncKey = useRef('');
  useEffect(() => {
    if (!data || syncKey.current === clavePeriodo) return;
    syncKey.current = clavePeriodo;
    // Prellena con el valor resuelto de este período; si no hay, con la
    // sugerencia del último período anterior (editable, no se guarda solo).
    setEdits(Object.fromEntries(data.map((s) => [s.cuil, s.monto ?? s.sugerencia?.valor ?? ''])));
  }, [data, clavePeriodo]);

  function aplicarPorcentaje() {
    const pct = Number(porcentaje);
    if (!porcentaje || Number.isNaN(pct)) return;
    setEdits((prev) => {
      const next = { ...prev };
      for (const s of data ?? []) {
        const base = s.monto ?? s.sugerencia?.valor;
        if (base == null) continue; // sin sueldo previo: no hay de dónde partir, se carga 1x1
        next[s.cuil] = (Number(base) * (1 + pct / 100)).toFixed(2);
      }
      return next;
    });
  }

  function guardarTodos() {
    const sueldos = (data ?? [])
      .filter((s) => edits[s.cuil] !== undefined && edits[s.cuil] !== '')
      .map((s) => ({ cuil: s.cuil, monto: Number(edits[s.cuil]) }));
    if (sueldos.length === 0) return;
    toast.promise(guardar.mutateAsync({ anio, mes, sueldos }), {
      loading: `Guardando sueldos de ${etiquetaMes(mes, anio)}…`,
      success: `Sueldos de ${etiquetaMes(mes, anio)} guardados`,
      error: (e) => mensajeDeError(e, 'No se pudieron guardar los sueldos'),
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title={`Sueldos mensualizados de ${etiquetaMes(mes, anio)}`}
        action={
          <button
            type="button"
            onClick={guardarTodos}
            disabled={guardar.isPending || (data ?? []).length === 0}
            className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            {guardar.isPending ? 'Guardando…' : `Guardar sueldos de ${etiquetaMes(mes, anio)}`}
          </button>
        }
      />
      <p className="text-sm text-slate">
        Cargá el monto que cobra <strong>por quincena</strong> (no el sueldo mensual completo): se
        aplica igual en las dos quincenas del mes elegido, y sigue vigente hacia adelante hasta el
        próximo cambio. Un mensualizado nuevo sin sueldo cargado todavía queda con el campo vacío
        para cargarlo a mano.
      </p>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <FiltroSelect
          label="Mes"
          value={mes}
          onChange={(v) => setMes(Number(v))}
          opciones={MESES_OPCIONES}
          opcional={false}
        />
        <FiltroNumero label="Año" value={anio} onChange={(v) => setAnio(Number(v) || anio)} className="w-24" />
        <div className="ml-auto flex items-end gap-2">
          <label className="flex flex-col text-xs text-slate">
            Incremento (%)
            <input
              aria-label="Porcentaje de incremento"
              type="number"
              step="0.01"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              className="w-28 rounded-md border border-line bg-surface px-2 py-1.5 tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <button
            type="button"
            onClick={aplicarPorcentaje}
            disabled={!porcentaje}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60 disabled:opacity-50"
          >
            Aplicar a todos
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          No hay empleados con régimen &quot;mensualizado&quot; cargados en Liquidación.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-2.5 font-medium">Empleado</th>
                <th className="px-4 py-2.5 font-medium">Categoría</th>
                <th className="px-4 py-2.5 font-medium">
                  Sueldo de {etiquetaMes(mes, anio)}
                  <span className="mt-0.5 block normal-case text-[11px] font-normal text-slate/70">
                    Acá va el monto que cobrará en la quincena
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((s) => (
                <tr key={s.cuil} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 text-ink">{s.apellidoNombre}</td>
                  <td className="px-4 py-2.5 text-slate">{s.categoria ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <input
                      aria-label={`Sueldo de ${s.apellidoNombre}`}
                      type="number"
                      step="0.01"
                      min={0}
                      value={edits[s.cuil] ?? ''}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [s.cuil]: e.target.value }))}
                      className="w-40 rounded-md border border-line bg-surface px-2 py-1 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                    {!s.resuelto && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        Sin resolver para {etiquetaMes(mes, anio)}
                        {s.sugerencia ? ` — sugerido: $${s.sugerencia.valor} (de ${etiquetaMes(s.sugerencia.periodo.mes, s.sugerencia.periodo.anio)})` : ''}
                      </p>
                    )}
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
