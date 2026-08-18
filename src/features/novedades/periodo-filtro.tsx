'use client';

import { useEffect, useRef, useState } from 'react';
import { QuincenaCampos } from '@/features/mis-registros/quincena-select';
import type { Quincena } from '@/lib/quincena';

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function etiquetaPeriodo(q: Quincena) {
  return `${q.parte === 1 ? '1ª' : '2ª'} ${MESES_CORTOS[q.mes - 1]} ${q.anio}`;
}

/** Filtro de período (año/mes/quincena), mismo look y mecánica de popover que
 * `MultiFiltro` (botón trigger + panel, cierra con click afuera o Escape) —
 * para que conviva como un filtro más en la barra, no como un control aparte.
 * Sin tildar ningún período todavía, es "(Todos)"; al elegir uno se activa. */
export function PeriodoFiltro({
  activo,
  periodo,
  onChange,
}: {
  activo: boolean;
  periodo: Quincena;
  onChange: (activo: boolean, periodo: Quincena) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function onPointerDown(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [abierto]);

  // Abrir el popover por primera vez ya activa el filtro con el período
  // mostrado (la quincena actual, por default) — mismo criterio que un
  // MultiFiltro (tildar = filtra al toque, sin paso de "aplicar" aparte).
  function toggleAbierto() {
    const vaAAbrir = !abierto;
    setAbierto(vaAAbrir);
    if (vaAAbrir && !activo) onChange(true, periodo);
  }

  return (
    <div ref={contenedorRef} className="relative flex flex-col text-xs text-slate">
      Período
      <button
        type="button"
        aria-label="Filtrar por período"
        aria-expanded={abierto}
        onClick={toggleAbierto}
        className="mt-0.5 flex cursor-pointer items-center gap-2 rounded border border-line px-2 py-1 text-sm text-ink"
      >
        <span>{activo ? etiquetaPeriodo(periodo) : 'Período'}</span>
        <span className="text-slate">▾</span>
      </button>
      {abierto && (
        <div className="absolute top-full z-10 mt-1 min-w-[260px] rounded-md border border-line bg-surface p-3 shadow-md">
          <div className="flex flex-wrap items-end gap-2">
            <QuincenaCampos value={periodo} onChange={(q) => onChange(true, q)} />
          </div>
          {activo && (
            <button
              type="button"
              onClick={() => {
                onChange(false, periodo);
                setAbierto(false);
              }}
              className="mt-2 text-xs font-medium text-slate underline transition hover:text-ink"
            >
              Todos los períodos
            </button>
          )}
        </div>
      )}
    </div>
  );
}
