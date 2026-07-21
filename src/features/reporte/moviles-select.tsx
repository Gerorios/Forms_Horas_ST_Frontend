'use client';

import { useEffect, useRef, useState } from 'react';
import type { Movil } from '@/types/domain';

export function MovilesSelect({
  moviles,
  value,
  onChange,
}: {
  moviles: Movil[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  const etiqueta = value.length > 0 ? `Móviles (${value.length} seleccionados) ▾` : 'Móviles ▾';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      >
        {etiqueta}
      </button>
      {abierto && (
        <div className="absolute z-10 mt-1 max-h-56 w-56 overflow-auto rounded-md border border-line bg-surface p-2 shadow-lg">
          {moviles.length === 0 ? (
            <p className="px-1 py-1 text-xs text-slate/70">No hay móviles cargados.</p>
          ) : (
            moviles.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 rounded px-1 py-1.5 text-sm text-ink hover:bg-accent/60"
              >
                <input type="checkbox" checked={value.includes(m.id)} onChange={() => toggle(m.id)} />
                {m.identificador}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
