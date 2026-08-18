'use client';

import { BarraFiltros, MultiFiltro } from '@/components/ui/barra-filtros';

export interface FiltrosRegistrosValue {
  contratoIds?: string[];
  cargadoPorCuils?: string[];
  operarioCuils?: string[];
}

export interface OpcionFiltroRegistros {
  value: string;
  label: string;
  count: number;
}

/** Opciones para poblar cada MultiFiltro — quien renderiza decide de dónde
 * salen (ej. facetadas a partir de los datos ya cargados en pantalla, con
 * los demás filtros aplicados). */
export interface FiltrosRegistrosOpciones {
  contratos: OpcionFiltroRegistros[];
  cargadores: OpcionFiltroRegistros[];
  operarios: OpcionFiltroRegistros[];
}

export function FiltrosRegistros({
  value,
  onChange,
  opciones,
}: {
  value: FiltrosRegistrosValue;
  onChange: (v: FiltrosRegistrosValue) => void;
  opciones: FiltrosRegistrosOpciones;
}) {
  const hayFiltros =
    (value.contratoIds?.length ?? 0) > 0 ||
    (value.cargadoPorCuils?.length ?? 0) > 0 ||
    (value.operarioCuils?.length ?? 0) > 0;

  return (
    <BarraFiltros hayFiltros={hayFiltros} onLimpiar={() => onChange({})}>
      <MultiFiltro
        label="Contrato"
        ariaLabel="Filtrar por contrato"
        opciones={opciones.contratos}
        seleccionados={value.contratoIds ?? []}
        onChange={(v) => onChange({ ...value, contratoIds: v })}
      />

      <MultiFiltro
        label="Cargado por"
        ariaLabel="Filtrar por quién cargó"
        opciones={opciones.cargadores}
        seleccionados={value.cargadoPorCuils ?? []}
        onChange={(v) => onChange({ ...value, cargadoPorCuils: v })}
      />

      <MultiFiltro
        label="Operario"
        ariaLabel="Filtrar por operario"
        opciones={opciones.operarios}
        seleccionados={value.operarioCuils ?? []}
        onChange={(v) => onChange({ ...value, operarioCuils: v })}
      />
    </BarraFiltros>
  );
}
