'use client';

import type { Quincena } from '@/lib/quincena';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function QuincenaSelect({
  value,
  onChange,
}: {
  value: Quincena;
  onChange: (q: Quincena) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col text-xs text-neutral">
        Mes
        <select
          aria-label="Mes"
          value={value.mes}
          onChange={(e) => onChange({ ...value, mes: Number(e.target.value) })}
          className="rounded border border-neutral/40 px-2 py-1"
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs text-neutral">
        Año
        <input
          aria-label="Año"
          type="number"
          value={value.anio}
          onChange={(e) => onChange({ ...value, anio: Number(e.target.value) })}
          className="w-24 rounded border border-neutral/40 px-2 py-1"
        />
      </label>
      <label className="flex flex-col text-xs text-neutral">
        Quincena
        <select
          aria-label="Quincena"
          value={value.parte}
          onChange={(e) => onChange({ ...value, parte: Number(e.target.value) as 1 | 2 })}
          className="rounded border border-neutral/40 px-2 py-1"
        >
          <option value={1}>1ª (1–15)</option>
          <option value={2}>2ª (16–fin)</option>
        </select>
      </label>
    </div>
  );
}
