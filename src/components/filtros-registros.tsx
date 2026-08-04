'use client';

import { BarraFiltros, FiltroFecha, FiltroSelect } from '@/components/ui/barra-filtros';

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
    <BarraFiltros hayFiltros={hayFiltros} onLimpiar={() => onChange({})}>
      <FiltroSelect
        label="Contrato"
        ariaLabel="Filtrar por contrato"
        value={value.contratoId ?? SIN_FILTRO}
        onChange={(v) => onChange({ ...value, contratoId: v ? Number(v) : undefined })}
        opciones={opciones.contratos.map((c) => ({ value: c.id, label: c.codigo }))}
      />

      <FiltroSelect
        label="Cargado por"
        ariaLabel="Filtrar por quién cargó"
        value={value.cargadoPorCuil ?? SIN_FILTRO}
        onChange={(v) => onChange({ ...value, cargadoPorCuil: v || undefined })}
        opciones={opciones.cargadores.map((c) => ({ value: c.cuil, label: c.nombre }))}
      />

      <FiltroSelect
        label="Operario"
        ariaLabel="Filtrar por operario"
        value={value.operarioCuil ?? SIN_FILTRO}
        onChange={(v) => onChange({ ...value, operarioCuil: v || undefined })}
        opciones={opciones.operarios.map((o) => ({ value: o.cuil, label: o.apellido_nombre }))}
      />

      <FiltroFecha
        label="Fecha"
        ariaLabel="Filtrar por fecha"
        value={value.fecha ?? SIN_FILTRO}
        onChange={(v) => onChange({ ...value, fecha: v || undefined })}
      />
    </BarraFiltros>
  );
}
