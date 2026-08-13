/**
 * Aplica un incremento porcentual a un mapa de importes en texto (los
 * borradores de formularios guardan strings). Redondea a 2 decimales.
 * Un campo vacío o no numérico queda como está: no hay de dónde partir,
 * se carga a mano (mismo criterio que el atajo de sueldos mensualizados,
 * ADR-016). Usado por el incremento masivo de categorías UOCRA.
 */
export function aplicarIncremento<K extends string | number>(
  valores: Record<K, string>,
  pct: number,
): Record<K, string> {
  const resultado = { ...valores };
  for (const clave of Object.keys(valores) as K[]) {
    const n = Number(valores[clave]);
    if (valores[clave] === '' || Number.isNaN(n)) continue;
    resultado[clave] = (n * (1 + pct / 100)).toFixed(2);
  }
  return resultado;
}
