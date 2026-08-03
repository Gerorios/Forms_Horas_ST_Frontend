'use client';

export interface FiltrosRegistrosValue {
  contratoId?: number;
  cargadoPorCuil?: string;
  operarioCuil?: string;
  fecha?: string;
}

/** Opciones para poblar cada select — quien renderiza decide de dónde salen
 * (ej. derivadas de los datos ya cargados en pantalla). */
export interface FiltrosRegistrosOpciones {
  contratos: { id: number; codigo: string }[];
  cargadores: { cuil: string; nombre: string }[];
  operarios: { cuil: string; apellido_nombre: string }[];
}

const SIN_FILTRO = '';

export function FiltrosRegistros({
  value,
  onChange,
  opciones,
}: {
  value: FiltrosRegistrosValue;
  onChange: (v: FiltrosRegistrosValue) => void;
  opciones: FiltrosRegistrosOpciones;
}) {
  const hayFiltros = Object.values(value).some((v) => v !== undefined && v !== '');

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-3">
      <label className="flex flex-col text-xs text-slate">
        Contrato
        <select
          aria-label="Filtrar por contrato"
          value={value.contratoId ?? SIN_FILTRO}
          onChange={(e) =>
            onChange({ ...value, contratoId: e.target.value ? Number(e.target.value) : undefined })
          }
          className="rounded border border-line px-2 py-1 text-sm text-ink"
        >
          <option value={SIN_FILTRO}>Todos</option>
          {opciones.contratos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs text-slate">
        Cargado por
        <select
          aria-label="Filtrar por quién cargó"
          value={value.cargadoPorCuil ?? SIN_FILTRO}
          onChange={(e) => onChange({ ...value, cargadoPorCuil: e.target.value || undefined })}
          className="rounded border border-line px-2 py-1 text-sm text-ink"
        >
          <option value={SIN_FILTRO}>Todos</option>
          {opciones.cargadores.map((c) => (
            <option key={c.cuil} value={c.cuil}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs text-slate">
        Operario
        <select
          aria-label="Filtrar por operario"
          value={value.operarioCuil ?? SIN_FILTRO}
          onChange={(e) => onChange({ ...value, operarioCuil: e.target.value || undefined })}
          className="rounded border border-line px-2 py-1 text-sm text-ink"
        >
          <option value={SIN_FILTRO}>Todos</option>
          {opciones.operarios.map((o) => (
            <option key={o.cuil} value={o.cuil}>
              {o.apellido_nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs text-slate">
        Fecha
        <input
          aria-label="Filtrar por fecha"
          type="date"
          value={value.fecha ?? SIN_FILTRO}
          onChange={(e) => onChange({ ...value, fecha: e.target.value || undefined })}
          className="rounded border border-line px-2 py-1 text-sm text-ink"
        />
      </label>

      {hayFiltros && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate underline transition hover:text-ink"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
