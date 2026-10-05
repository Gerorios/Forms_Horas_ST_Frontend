/** Baja de Operario (ADR-026 del backend): novedad cuya fecha es el ÚLTIMO
 * DÍA TRABAJADO. La confirma HyS; confirmada, bloquea la carga de horas
 * posteriores y liquida $0 en las quincenas siguientes. Nombre exacto del
 * tipo en el catálogo, mismo criterio por nombre que 'Ausencia'. */
export const TIPO_BAJA = 'Baja de Operario';

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. */
export function fechaLegible(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** 'YYYY-MM-DD' → 'DD/MM'. */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}`;
}
