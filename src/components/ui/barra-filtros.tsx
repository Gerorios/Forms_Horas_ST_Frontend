'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { contieneTexto } from '@/lib/facetado';

/** Contenedor estándar de una barra de filtros — mismo look en toda la app
 * (referencia: aprobaciones / filtros-registros.tsx). El botón "Limpiar
 * filtros" solo aparece si `hayFiltros` es true. */
export function BarraFiltros({
  children,
  hayFiltros,
  onLimpiar,
}: {
  children: ReactNode;
  hayFiltros: boolean;
  onLimpiar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-3">
      {children}
      {hayFiltros && (
        <button
          type="button"
          onClick={onLimpiar}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate underline transition hover:text-ink"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

export function FiltroSelect<T extends string | number>({
  label,
  value,
  onChange,
  opciones,
  placeholder = 'Todos',
  /** false para selects que siempre tienen un valor válido (ej. mes,
   * quincena) — ahí no corresponde ofrecer una opción vacía "Todos". */
  opcional = true,
  ariaLabel,
}: {
  label: string;
  value: T | '';
  onChange: (v: string) => void;
  opciones: { value: T; label: string }[];
  placeholder?: string;
  opcional?: boolean;
  ariaLabel?: string;
}) {
  return (
    <label className="flex flex-col text-xs text-slate">
      {label}
      <select
        aria-label={ariaLabel ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-line px-2 py-1 text-sm text-ink"
      >
        {opcional && <option value="">{placeholder}</option>}
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FiltroFecha({
  label,
  value,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  return (
    <label className="flex flex-col text-xs text-slate">
      {label}
      <input
        aria-label={ariaLabel ?? label}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-line px-2 py-1 text-sm text-ink"
      />
    </label>
  );
}

export function FiltroBusqueda({
  label,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <label className="flex flex-col text-xs text-slate">
      {label}
      <input
        aria-label={ariaLabel ?? label}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded border border-line px-2 py-1 text-sm text-ink"
      />
    </label>
  );
}

/** Checkbox multi-selección facetado (ej. Régimen, Categoría, Contrato,
 * Operario) con el mismo look que los demás filtros — el filtro estándar
 * para cualquier categoría de la app. Popover controlado (sin dependencias
 * nuevas): un botón trigger con "Label" / "Label (N)" y un desplegable con
 * checkboxes, opción fija "(Todos)" (indeterminate si la selección es
 * parcial; click marca/desmarca solo las opciones VISIBLES) y, si hay más de
 * 10 opciones, un buscador interno que filtra por label sin distinguir
 * tildes/mayúsculas. Cierra con click afuera o Escape. `opciones` ya viene
 * facetada (calculada por quien renderiza a partir de las filas que pasan
 * los demás filtros) y puede traer `count`. */
export function MultiFiltro({
  label,
  opciones,
  seleccionados,
  onChange,
  ariaLabel,
}: {
  label: string;
  opciones: { value: string; label: string; count?: number }[];
  seleccionados: string[];
  onChange: (v: string[]) => void;
  ariaLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
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

  useEffect(() => {
    if (!abierto) setBusqueda('');
  }, [abierto]);

  function toggle(value: string) {
    if (seleccionados.includes(value)) {
      onChange(seleccionados.filter((v) => v !== value));
    } else {
      onChange([...seleccionados, value]);
    }
  }

  const conBuscador = opciones.length > 10;
  const visibles = conBuscador ? opciones.filter((o) => contieneTexto(o.label, busqueda)) : opciones;
  const valoresVisibles = visibles.map((o) => o.value);
  const todasVisiblesSeleccionadas = visibles.length > 0 && visibles.every((o) => seleccionados.includes(o.value));
  const algunaVisibleSeleccionada = visibles.some((o) => seleccionados.includes(o.value));
  const indeterminado = algunaVisibleSeleccionada && !todasVisiblesSeleccionadas;

  function toggleTodos() {
    if (todasVisiblesSeleccionadas) {
      onChange(seleccionados.filter((v) => !valoresVisibles.includes(v)));
    } else {
      onChange([...new Set([...seleccionados, ...valoresVisibles])]);
    }
  }

  return (
    <div ref={contenedorRef} className="relative flex flex-col text-xs text-slate">
      {label}
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className="mt-0.5 flex cursor-pointer items-center gap-2 rounded border border-line px-2 py-1 text-sm text-ink"
      >
        <span>{seleccionados.length > 0 ? `${label} (${seleccionados.length})` : label}</span>
        <span className="text-slate">▾</span>
      </button>
      {abierto && (
        <div className="absolute top-full z-10 mt-1 max-h-72 min-w-[220px] overflow-y-auto rounded-md border border-line bg-surface p-2 shadow-md">
          {conBuscador && (
            <input
              type="text"
              aria-label={`Buscar en ${label}`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              autoFocus
              className="mb-2 w-full rounded border border-line px-2 py-1 text-sm text-ink"
            />
          )}
          <label className="mb-1 flex cursor-pointer items-center gap-2 rounded border-b border-line px-1 pb-1.5 text-sm font-medium text-ink hover:bg-accent/30">
            <input
              ref={(el) => {
                if (el) el.indeterminate = indeterminado;
              }}
              type="checkbox"
              aria-label="(Todos)"
              checked={todasVisiblesSeleccionadas}
              onChange={toggleTodos}
              disabled={visibles.length === 0}
            />
            <span>(Todos)</span>
          </label>
          {visibles.length === 0 ? (
            <p className="px-1 py-1 text-xs text-slate">Sin opciones</p>
          ) : (
            visibles.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm text-ink hover:bg-accent/30"
              >
                <input
                  type="checkbox"
                  aria-label={o.label}
                  checked={seleccionados.includes(o.value)}
                  onChange={() => toggle(o.value)}
                />
                <span className="flex-1">{o.label}</span>
                {o.count !== undefined && <span className="text-xs tabular-nums text-slate">{o.count}</span>}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Selector numérico compacto (ej. Año) con el mismo estilo que los demás
 * filtros — no hay un <input type="number"> nativo entre las primitivas de
 * texto/fecha/select, así que se agrega esta variante mínima. */
export function FiltroNumero({
  label,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <label className="flex flex-col text-xs text-slate">
      {label}
      <input
        aria-label={ariaLabel ?? label}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded border border-line px-2 py-1 text-sm text-ink ${className ?? ''}`}
      />
    </label>
  );
}
