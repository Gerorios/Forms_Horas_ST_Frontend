'use client';

import { useTareas } from '@/lib/api/catalogos';
import type { ContratoResumen } from '@/types/domain';

/** Picker de tareas de un contrato, en chips toggle-ables. Se usa tanto en el alta
 * (nueva carga) como en la edición de una carga existente. */
export function ContratoTareas({
  contrato,
  tareaIds,
  onToggle,
}: {
  contrato: ContratoResumen;
  tareaIds: number[];
  onToggle: (id: number) => void;
}) {
  const { data: tareas } = useTareas(contrato.id);
  if ((tareas ?? []).length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate">{contrato.codigo}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {(tareas ?? []).map((t) => {
          const activa = tareaIds.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={activa}
              onClick={() => onToggle(t.id)}
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
    </div>
  );
}
