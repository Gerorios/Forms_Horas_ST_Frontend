'use client';

import type { ReactNode } from 'react';

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

/** Checkbox multi-selección facetado (ej. Régimen, Categoría, Contrato) con el
 * mismo look que los demás filtros. No hay una primitiva de popover en el
 * repo, así que se usa un `<details>/<summary>` estilizado: el `summary` hace
 * de "caja" del filtro y el `<div>` de adentro es el desplegable de
 * checkboxes. `opciones` ya viene facetada (calculada por quien renderiza a
 * partir de las filas que pasan los demás filtros) y puede traer `count`. */
export function FiltroChecks({
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
  function toggle(value: string) {
    if (seleccionados.includes(value)) {
      onChange(seleccionados.filter((v) => v !== value));
    } else {
      onChange([...seleccionados, value]);
    }
  }

  return (
    <div className="flex flex-col text-xs text-slate">
      {label}
      <details className="group relative mt-0.5">
        <summary
          aria-label={ariaLabel ?? label}
          className="flex cursor-pointer list-none items-center gap-2 rounded border border-line px-2 py-1 text-sm text-ink [&::-webkit-details-marker]:hidden"
        >
          <span>
            {seleccionados.length > 0
              ? `${seleccionados.length} seleccionado${seleccionados.length === 1 ? '' : 's'}`
              : 'Todos'}
          </span>
          <span className="text-slate">▾</span>
        </summary>
        <div className="absolute z-10 mt-1 max-h-56 min-w-[200px] overflow-y-auto rounded-md border border-line bg-surface p-2 shadow-md">
          {opciones.length === 0 ? (
            <p className="px-1 py-1 text-xs text-slate">Sin opciones</p>
          ) : (
            opciones.map((o) => (
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
      </details>
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
