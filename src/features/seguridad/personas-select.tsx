'use client';

import { useId, useState, type ReactNode } from 'react';
import { useBuscarEmpleados } from '@/lib/api/empleados';
import type { EmpleadoBusqueda } from '@/types/domain';
import { FOCO_VISIBLE } from './tipos';

const CAMPO =
  'min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-ink outline-none placeholder:text-slate focus:border-brand-deep focus:ring-2 focus:ring-brand/40 aria-[invalid=true]:border-danger disabled:bg-sand sm:text-sm';

const MINIMO = 3;

/**
 * Buscador de personas de la nómina para Seguridad (crítica impeccable
 * 2026-10-08, P1). Decide a quién se le restan puntos en una inspección, así
 * que no puede ser ambiguo: rótulo asociado, fichas con nombre y legajo,
 * quitar con área táctil de 44 px y estados claros (faltan letras, buscando,
 * sin coincidencias, error con reintento).
 *
 * Patrón combobox: el foco queda en el campo y las flechas recorren los
 * resultados (aria-activedescendant); Enter elige y Escape limpia.
 */
export function PersonasSelect({
  id,
  label,
  ayuda,
  value,
  onChange,
  max,
  idError,
  deshabilitado,
}: {
  id: string;
  label: ReactNode;
  /** Línea chica bajo el rótulo (p. ej. qué pasa con las personas que se nombran). */
  ayuda?: ReactNode;
  value: EmpleadoBusqueda[];
  onChange: (v: EmpleadoBusqueda[]) => void;
  /** 1 = una sola persona: elegir otra la reemplaza. */
  max?: number;
  /** id del mensaje de error del formulario, si el campo falta. */
  idError?: string;
  deshabilitado?: boolean;
}) {
  const base = useId();
  const idLista = `${base}-resultados`;
  const idEstado = `${base}-estado`;
  const idAyuda = `${base}-ayuda`;
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState(0);
  const term = q.trim();
  const busqueda = useBuscarEmpleados(term);
  const elegidos = new Set(value.map((p) => p.cuil));
  const resultados = term.length >= MINIMO ? (busqueda.data ?? []).filter((p) => !elegidos.has(p.cuil)) : [];
  const abierta = resultados.length > 0;

  function elegir(p: EmpleadoBusqueda) {
    onChange(max === 1 ? [p] : [...value, p]);
    setQ('');
    setActivo(0);
  }

  function quitar(cuil: string) {
    onChange(value.filter((p) => p.cuil !== cuil));
  }

  function onTecla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && abierta) {
      e.preventDefault();
      setActivo((a) => Math.min(a + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp' && abierta) {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && abierta) {
      e.preventDefault();
      elegir(resultados[Math.min(activo, resultados.length - 1)]);
    } else if (e.key === 'Escape' && q) {
      e.preventDefault();
      setQ('');
    }
  }

  let estado: ReactNode = null;
  if (term.length > 0 && term.length < MINIMO) estado = `Escribí al menos ${MINIMO} letras del nombre o el legajo.`;
  else if (term.length >= MINIMO && busqueda.isError) {
    estado = (
      <>
        No pudimos buscar.{' '}
        <button type="button" onClick={() => void busqueda.refetch()} className={`min-h-11 px-1 font-semibold text-ink underline underline-offset-2 ${FOCO_VISIBLE}`}>
          Reintentar
        </button>
      </>
    );
  } else if (term.length >= MINIMO && !busqueda.data) estado = 'Buscando…';
  else if (term.length >= MINIMO && resultados.length === 0) estado = `Sin coincidencias para “${term}”.`;

  const describedBy = [ayuda ? idAyuda : null, idEstado, idError].filter(Boolean).join(' ');

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {ayuda && (
        <p id={idAyuda} className="text-xs text-slate">
          {ayuda}
        </p>
      )}

      {value.length > 0 && (
        <ul aria-label="Personas elegidas" className="flex flex-wrap gap-2">
          {value.map((p) => (
            <li key={p.cuil} className="inline-flex items-center gap-1 rounded-lg border border-line bg-sand pl-3 text-sm text-ink">
              <span>
                {p.apellido_nombre}
                {p.legajo > 0 && <span className="text-slate"> · leg. {p.legajo}</span>}
              </span>
              <button
                type="button"
                aria-label={`Quitar ${p.apellido_nombre}`}
                disabled={deshabilitado}
                onClick={() => quitar(p.cuil)}
                className={`flex h-11 w-11 items-center justify-center rounded-lg text-slate hover:bg-danger/10 hover:text-danger disabled:opacity-50 ${FOCO_VISIBLE}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={abierta}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={abierta ? `${idLista}-${Math.min(activo, resultados.length - 1)}` : undefined}
          aria-describedby={describedBy}
          aria-invalid={idError ? true : undefined}
          autoComplete="off"
          disabled={deshabilitado}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActivo(0);
          }}
          onKeyDown={onTecla}
          placeholder={max === 1 && value.length > 0 ? 'Buscar otra persona para reemplazarla' : 'Buscar persona por nombre o legajo'}
          className={CAMPO}
        />
        {abierta && (
          <ul id={idLista} role="listbox" aria-label="Resultados" className="mt-1 max-h-64 overflow-auto rounded-md border border-line bg-surface py-1 shadow-sm">
            {resultados.map((p, i) => (
              <li
                key={p.cuil}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === activo}
                // mousedown: elige antes de que el campo pierda el foco.
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(p);
                }}
                onMouseEnter={() => setActivo(i)}
                className={`flex min-h-11 cursor-pointer items-center px-3 text-sm text-ink ${i === activo ? 'bg-accent' : ''}`}
              >
                {p.apellido_nombre}
                <span className="ml-1 text-slate">· leg. {p.legajo}</span>
                {p.cargo?.trim() && <span className="ml-1 truncate text-slate">· {p.cargo.trim().toLowerCase()}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p id={idEstado} role="status" aria-live="polite" className="text-xs text-slate empty:hidden">
        {estado}
      </p>
    </div>
  );
}
