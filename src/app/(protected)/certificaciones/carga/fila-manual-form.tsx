'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import type { FilaManualCarga, ItemMaestroCarga } from '@/lib/api/certificaciones';

/** Formulario de FILA MANUAL del paso 3 (mockup 2026-09-07): el parser no
 * reconoció una línea que sí está en el documento y el usuario la agrega a
 * mano. El ítem NO se tipea: se elige del maestro ya filtrado por los
 * contratos del usuario (`useItemsMaestroCarga`), así el contrato K, la tarea
 * y la unidad salen del maestro y no del teclado.
 *
 * El total se PROPONE como cantidad × unitario (para que la fila cuadre sola)
 * pero queda editable: si el documento imprime otro total, manda el impreso y
 * la fila se revalida como cualquier otra (puede quedar bloqueada por
 * cuadratura y el usuario la confirma a mano). */

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

/** Coma→punto para que un usuario es-AR pueda tipear "15151,96". Copia del
 * helper de `page.tsx` (3 líneas, no vale un módulo compartido). */
function normalizarDecimal(v: string): string {
  return v.trim().replace(',', '.');
}

function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

export function FilaManualForm({
  items,
  provincias,
  onAgregar,
  onCancelar,
}: {
  items: ItemMaestroCarga[];
  provincias: string[];
  onAgregar: (m: FilaManualCarga & { item: ItemMaestroCarga }) => void;
  onCancelar: () => void;
}) {
  const [idItem, setIdItem] = useState('');
  const [provincia, setProvincia] = useState(provincias[0] ?? '');
  const [cantidad, setCantidad] = useState('');
  const [unitario, setUnitario] = useState('');
  /** `null` = el usuario todavía no tocó el total, así que vale el propuesto
   * (cantidad × unitario). Se guarda así, DERIVANDO el propuesto en el render,
   * en vez de sincronizarlo con un `useEffect` + flag: el efecto sería un
   * setState en cascada (lo prohíbe `react-hooks/set-state-in-effect`) y este
   * estado no necesita sincronizarse con nada externo. */
  const [totalTipeado, setTotalTipeado] = useState<string | null>(null);

  const cant = num(cantidad);
  const unit = num(unitario);
  const totalPropuesto = cant === null || unit === null ? '' : (cant * unit).toFixed(2);
  const total = totalTipeado ?? totalPropuesto;

  const item = items.find((i) => String(i.id_item) === idItem) ?? null;
  const completo = item !== null && provincia !== '' && cant !== null && unit !== null;

  function agregar() {
    if (!item) return;
    onAgregar({
      item,
      id_item: item.id_item,
      provincia,
      cantidades: cantidad,
      precio_unitario: unitario,
      total_mes: total,
    });
  }

  return (
    <div
      className="grid gap-2.5 rounded-xl border border-dashed border-[#3b6fc4]/50 bg-[#3b6fc4]/5 px-4 py-3.5"
      data-testid="form-manual"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-[#3b6fc4]">Agregar fila manual</p>
        <p className="text-xs text-slate">
          Solo para filas que están en el documento y el parser no reconoció. Queda marcada como manual en el historial.
        </p>
      </div>

      <div className="grid items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-[2.2fr_1fr_1fr_1.1fr_1.1fr_auto]">
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate">Ítem del maestro (tus contratos)</span>
          <select value={idItem} onChange={(e) => setIdItem(e.target.value)} className={inputCls}>
            <option value="">Elegí un ítem</option>
            {items.map((i) => (
              <option key={i.id_item} value={String(i.id_item)}>
                {`${i.codigo_k} · ${i.item_codigo} · ${i.tarea}`}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate">Provincia</span>
          <select value={provincia} onChange={(e) => setProvincia(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {provincias.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate">Cantidad</span>
          <input
            value={cantidad}
            inputMode="decimal"
            onChange={(e) => setCantidad(normalizarDecimal(e.target.value))}
            className={`${inputCls} text-right tabular-nums`}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate">$ Unitario</span>
          <input
            value={unitario}
            inputMode="decimal"
            onChange={(e) => setUnitario(normalizarDecimal(e.target.value))}
            className={`${inputCls} text-right tabular-nums`}
          />
        </label>

        {/* El hint queda FUERA del <label> a propósito: dentro, su texto se
            sumaría al nombre accesible del input ("$ Total propuesto: …"). */}
        <div className="grid gap-1">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-slate">$ Total</span>
            <input
              value={total}
              inputMode="decimal"
              onChange={(e) => setTotalTipeado(normalizarDecimal(e.target.value))}
              className={`${inputCls} text-right tabular-nums`}
            />
          </label>
          <span className="text-xs text-slate">propuesto: cantidad × unitario</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!completo}
            onClick={agregar}
            className="border-[#3b6fc4]/50 text-[#3b6fc4]"
          >
            Agregar
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </div>

      {item && (
        <p className="text-xs text-slate">
          Contrato <span className="font-medium text-ink">{item.codigo_k}</span> · {item.tarea}
          {item.unidad_medida ? ` · ${item.unidad_medida}` : ''}
        </p>
      )}
    </div>
  );
}
