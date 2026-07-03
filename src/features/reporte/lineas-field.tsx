'use client';

import { useTareas } from '@/lib/api/catalogos';
import type { ContratoResumen } from '@/types/domain';

export type LineaBorrador = {
  contratoId: number | null;
  tareaId: number | null;
  horas: number | null;
};

function LineaRow({
  contratos,
  linea,
  onChange,
  onRemove,
  removable,
}: {
  contratos: ContratoResumen[];
  linea: LineaBorrador;
  onChange: (l: LineaBorrador) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const { data: tareas } = useTareas(linea.contratoId);
  return (
    <div className="flex flex-wrap items-end gap-2 rounded border border-neutral/20 p-2">
      <label className="flex flex-col text-xs text-neutral">
        Contrato
        <select
          aria-label="Contrato"
          className="rounded border border-neutral/40 px-2 py-1"
          value={linea.contratoId ?? ''}
          onChange={(e) =>
            onChange({ ...linea, contratoId: e.target.value ? Number(e.target.value) : null, tareaId: null })
          }
        >
          <option value="">—</option>
          {contratos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs text-neutral">
        Tarea
        <select
          aria-label="Tarea"
          disabled={linea.contratoId == null}
          className="rounded border border-neutral/40 px-2 py-1 disabled:opacity-50"
          value={linea.tareaId ?? ''}
          onChange={(e) => onChange({ ...linea, tareaId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">—</option>
          {(tareas ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs text-neutral">
        Horas
        <input
          aria-label="Horas"
          type="number"
          min="0"
          step="0.5"
          className="w-24 rounded border border-neutral/40 px-2 py-1"
          value={linea.horas ?? ''}
          onChange={(e) => onChange({ ...linea, horas: e.target.value ? Number(e.target.value) : null })}
        />
      </label>

      {removable && (
        <button type="button" onClick={onRemove} className="px-2 py-1 text-sm text-alert">
          Quitar
        </button>
      )}
    </div>
  );
}

export function LineasField({
  contratos,
  value,
  onChange,
}: {
  contratos: ContratoResumen[];
  value: LineaBorrador[];
  onChange: (v: LineaBorrador[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.map((linea, i) => (
        <LineaRow
          key={i}
          contratos={contratos}
          linea={linea}
          removable={value.length > 1}
          onChange={(l) => onChange(value.map((x, j) => (j === i ? l : x)))}
          onRemove={() => onChange(value.filter((_, j) => j !== i))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { contratoId: null, tareaId: null, horas: null }])}
        className="rounded border border-brand px-3 py-1 text-sm text-brand"
      >
        Agregar línea
      </button>
    </div>
  );
}
