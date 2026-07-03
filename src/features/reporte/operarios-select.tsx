'use client';

import { useState } from 'react';
import { useBuscarEmpleados } from '@/lib/api/empleados';
import type { EmpleadoBusqueda } from '@/types/domain';

export function OperariosSelect({
  value,
  onChange,
}: {
  value: EmpleadoBusqueda[];
  onChange: (v: EmpleadoBusqueda[]) => void;
}) {
  const [q, setQ] = useState('');
  const term = q.trim();
  const { data } = useBuscarEmpleados(term);

  function agregar(emp: EmpleadoBusqueda) {
    if (value.some((e) => e.cuil === emp.cuil)) return;
    onChange([...value, emp]);
    setQ('');
  }

  function quitar(cuil: string) {
    onChange(value.filter((e) => e.cuil !== cuil));
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((e) => (
            <span
              key={e.cuil}
              className="inline-flex items-center gap-1 rounded bg-neutral/10 px-2 py-1 text-sm"
            >
              {e.apellido_nombre}
              <button
                type="button"
                aria-label={`Quitar ${e.apellido_nombre}`}
                onClick={() => quitar(e.cuil)}
                className="text-alert"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        role="textbox"
        value={q}
        onChange={(ev) => setQ(ev.target.value)}
        placeholder="Buscar operario por nombre…"
        className="w-full rounded border border-neutral/40 px-3 py-2"
      />

      {term.length < 3 ? (
        <p className="text-xs text-neutral/60">Escribí al menos 3 letras para buscar.</p>
      ) : (
        <ul className="max-h-48 overflow-auto rounded border border-neutral/20">
          {(data ?? []).map((e) => (
            <li key={e.cuil}>
              <button
                type="button"
                onClick={() => agregar(e)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral/10"
              >
                {e.apellido_nombre} <span className="text-neutral/50">· leg. {e.legajo}</span>
              </button>
            </li>
          ))}
          {(data ?? []).length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral/60">Sin coincidencias.</li>
          )}
        </ul>
      )}
    </div>
  );
}
