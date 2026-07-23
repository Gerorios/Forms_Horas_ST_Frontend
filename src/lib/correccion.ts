export type CorreccionInput = {
  id: number;
  loteId: string;
  loteIdOrigen: string | null;
  contrato: { id: number };
  horas: number;
  motivoDesaprobacion?: string | null;
};

export type InfoCorreccion =
  | { tipo: 'corrige'; original: CorreccionInput }
  | { tipo: 'reemplazada'; nueva: CorreccionInput };

/**
 * Detecta, dentro de un mismo listado, si una fila/línea es la corrección de
 * otra (loteIdOrigen apunta a un loteId presente en el listado) o si fue
 * reemplazada por una corrección (algún otro elemento la referencia). Se
 * compara por (loteId, contrato) — no por operario — porque la corrección es
 * de la línea completa, no de una persona puntual. Ver ADR-006.
 */
export function infoCorreccion(
  fila: CorreccionInput,
  todas: CorreccionInput[],
): InfoCorreccion | null {
  if (fila.loteIdOrigen) {
    const original = todas.find(
      (r) => r.loteId === fila.loteIdOrigen && r.contrato.id === fila.contrato.id,
    );
    if (original) return { tipo: 'corrige', original };
  }
  const nueva = todas.find(
    (r) => r.loteIdOrigen === fila.loteId && r.contrato.id === fila.contrato.id,
  );
  if (nueva) return { tipo: 'reemplazada', nueva };
  return null;
}
