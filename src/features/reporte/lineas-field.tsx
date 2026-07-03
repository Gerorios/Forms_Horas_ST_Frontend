'use client';

import { useTareas } from '@/lib/api/catalogos';
import type { ContratoResumen } from '@/types/domain';

export type LineaBorrador = {
  contratoId: number | null;
  horas: number | null;
  tareaIds: number[];
};

function LineaRow({
  contratos,
  usados,
  linea,
  onChange,
  onRemove,
  removable,
}: {
  contratos: ContratoResumen[];
  usados: number[];
  linea: LineaBorrador;
  onChange: (l: LineaBorrador) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const { data: tareas } = useTareas(linea.contratoId);

  function toggleTarea(id: number) {
    const yaEsta = linea.tareaIds.includes(id);
    onChange({
      ...linea,
      tareaIds: yaEsta
        ? linea.tareaIds.filter((t) => t !== id)
        : [...linea.tareaIds, id],
    });
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col text-xs font-medium text-slate">
          Contrato
          <select
            aria-label="Contrato"
            className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            value={linea.contratoId ?? ''}
            onChange={(e) =>
              onChange({
                ...linea,
                contratoId: e.target.value ? Number(e.target.value) : null,
                tareaIds: [],
              })
            }
          >
            <option value="">—</option>
            {contratos.map((c) => (
              <option
                key={c.id}
                value={c.id}
                disabled={usados.includes(c.id) && c.id !== linea.contratoId}
              >
                {c.codigo}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs font-medium text-slate">
          Horas
          <input
            aria-label="Horas"
            type="number"
            min="0"
            step="0.5"
            className="mt-1 w-24 rounded-md border border-line bg-surface px-2 py-1.5 text-sm tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            value={linea.horas ?? ''}
            onChange={(e) =>
              onChange({ ...linea, horas: e.target.value ? Number(e.target.value) : null })
            }
          />
        </label>

        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto rounded-md px-2 py-1.5 text-xs text-danger transition hover:bg-danger/10"
          >
            Quitar
          </button>
        )}
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium text-slate">Tareas</p>
        {linea.contratoId == null ? (
          <p className="mt-1 text-xs text-slate/70">Elegí un contrato para ver sus tareas.</p>
        ) : (tareas ?? []).length === 0 ? (
          <p className="mt-1 text-xs text-slate/70">Este contrato no tiene tareas cargadas.</p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(tareas ?? []).map((t) => {
              const activa = linea.tareaIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => toggleTarea(t.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    activa
                      ? 'border-brand bg-accent font-medium text-ink'
                      : 'border-line text-slate hover:border-brand/50'
                  }`}
                >
                  {t.nombre}
                </button>
              );
            })}
          </div>
        )}
      </div>
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
  const usados = value.map((l) => l.contratoId).filter((x): x is number => x != null);

  return (
    <div className="space-y-2">
      {value.map((linea, i) => (
        <LineaRow
          key={i}
          contratos={contratos}
          usados={usados}
          linea={linea}
          removable={value.length > 1}
          onChange={(l) => onChange(value.map((x, j) => (j === i ? l : x)))}
          onRemove={() => onChange(value.filter((_, j) => j !== i))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { contratoId: null, horas: null, tareaIds: [] }])}
        className="rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand-deep transition hover:bg-accent"
      >
        Agregar contrato
      </button>
    </div>
  );
}
