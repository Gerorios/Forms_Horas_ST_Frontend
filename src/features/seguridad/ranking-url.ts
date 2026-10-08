import { RANGO_INICIAL, type FiltroRangoValor, type ModoRango } from './filtro-rango';

const MODOS: ModoRango[] = ['anio', 'semestre', 'trimestre', 'mes', 'libre'];

/** Rango del ranking en la dirección de la página (`?rango=mes`,
 * `?rango=libre&desde=…&hasta=…`). Sin nada, el año en curso. */
export function rangoDeUrl(p: URLSearchParams): FiltroRangoValor {
  const modo = p.get('rango') as ModoRango | null;
  if (!modo || !MODOS.includes(modo)) return RANGO_INICIAL;
  return { modo, desde: p.get('desde') ?? '', hasta: p.get('hasta') ?? '' };
}

export function urlDeRango(v: FiltroRangoValor): string {
  if (v.modo === 'anio') return '';
  const p = new URLSearchParams({ rango: v.modo });
  if (v.modo === 'libre') {
    if (v.desde) p.set('desde', v.desde);
    if (v.hasta) p.set('hasta', v.hasta);
  }
  return `?${p.toString()}`;
}
