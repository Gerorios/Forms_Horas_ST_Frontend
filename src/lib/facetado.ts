export interface OpcionFacet {
  value: string;
  label: string;
  count: number;
}

/** Normaliza para comparar sin distinguir tildes/mayúsculas (búsquedas
 * internas de MultiFiltro, filtros de nombre en varias pantallas). */
export function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function contieneTexto(texto: string, busqueda: string): boolean {
  return busqueda.trim() === '' || normalizarTexto(texto).includes(normalizarTexto(busqueda));
}

/**
 * Facetado estándar: cuenta cuántos `items` (de los que ya pasan los DEMÁS
 * filtros — eso lo decide quien llama, pasando la lista ya acotada) tienen
 * cada valor, y siempre incluye los valores ya seleccionados aunque hayan
 * quedado en 0 (para poder destildarlos). `extraerValores` puede devolver un
 * solo valor, varios (ej. contratos de los días de un empleado) o null/[]
 * cuando no aplica.
 */
export function opcionesFacetadas<T>(
  items: T[],
  extraerValores: (item: T) => string | (string | null | undefined)[] | null | undefined,
  seleccionados: string[],
  opts?: { labelDe?: (value: string) => string },
): OpcionFacet[] {
  const labelDe = opts?.labelDe ?? ((v: string) => v);
  const counts = new Map<string, number>();
  for (const item of items) {
    const raw = extraerValores(item);
    const valores = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    for (const v of new Set(valores.filter((v): v is string => v != null))) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  for (const s of seleccionados) if (!counts.has(s)) counts.set(s, 0);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: labelDe(value), count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
