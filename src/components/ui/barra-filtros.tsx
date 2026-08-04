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
