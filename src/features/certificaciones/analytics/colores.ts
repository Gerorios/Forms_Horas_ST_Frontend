/** Paleta propia de Analytics de Certificaciones — constantes HEX (no tokens
 * `@theme`: Recharts no las resuelve en el SVG ni en los `style` inline).
 * `COLOR_MONTO` es el brand-deep dorado, la misma serie "monto" del resto del
 * portal (liquidación, control-general); `COLOR_PGN` es un azul frío de
 * contraste para la serie de Puntos Gasnor (unidad distinta, no compite
 * visualmente con el monto). `PALETA_CONTRATOS` es la categórica para el
 * apilado por contrato — mismo criterio de contraste/daltonismo que
 * `features/liquidacion/analisis/colores.ts` y
 * `features/control-general/chart-colors.ts`. */
export const COLOR_MONTO = '#a97a16';
export const COLOR_PGN = '#3b6fc4';
/** Gris neutro para "Otros" (contratos fuera del top N en el apilado) y para
 * celdas "sin dato" en la matriz operativa — un resto, no una serie más. */
export const COLOR_OTROS = '#9a9ea3';

export const PALETA_CONTRATOS = [
  '#a97a16',
  '#3b6fc4',
  '#1f8a70',
  '#7d5bc6',
  '#b3543e',
  '#c4913b',
  '#4f8fb0',
  '#8a6a9e',
];

export function colorContrato(indice: number): string {
  return PALETA_CONTRATOS[indice % PALETA_CONTRATOS.length];
}

/** Moneda es-AR, sin centavos por defecto (KPIs y ejes de gráficos). */
export function fmtMoneda(n: number, decimales = 0): string {
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Puntos Gasnor: entero es-AR, sin símbolo de moneda (es una unidad propia). */
export function fmtPgn(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

/** Porcentaje es-AR con 1 decimal y signo explícito para variaciones. */
export function fmtPct(n: number, conSigno = false): string {
  const texto = `${n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  return conSigno && n > 0 ? `+${texto}` : texto;
}

const NOMBRES_MES_CORTO = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** "YYYY-MM" -> "mmm YY" (ej. "2026-03" -> "mar 26"), para ejes de gráficos. */
export function etiquetaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  const idx = Number(mes) - 1;
  const nombre = NOMBRES_MES_CORTO[idx] ?? mes;
  return `${nombre} ${anio.slice(2)}`;
}

export const NOMBRES_MES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];
