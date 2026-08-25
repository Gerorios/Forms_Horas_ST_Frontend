/** Paleta categórica de 5 series de la composición del pago — validada con el
 * validador de dataviz sobre superficie blanca. Se usan las constantes HEX y
 * NO los tokens `@theme` (`--color-chart-N`): los tokens no llegan al SVG ni
 * a los `style` inline de Recharts. Espejo de `--color-chart-1..5` en
 * globals.css. */
export const COLOR_BASICO = '#a97a16';
export const COLOR_EXTRAS = '#3b6fc4';
export const COLOR_PRESENTISMO = '#1f8a70';
export const COLOR_PLUS = '#7d5bc6';
export const COLOR_BONO = '#b3543e';

/** Moneda es-AR. Por defecto sin centavos (tiles y labels de gráficos: los
 * centavos no aportan en un KPI); 2 decimales solo donde se compara fino
 * (tabla de variaciones). */
export function fmtMoneda(n: number, decimales = 0): string {
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Horas es-AR con hasta 2 decimales (sin colas de floats tipo 45,99999999). */
export function fmtHoras(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

/** Porcentaje es-AR con 1 decimal y signo explícito para deltas (+10,5 %). */
export function fmtPct(n: number, conSigno = false): string {
  const texto = `${n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  return conSigno && n > 0 ? `+${texto}` : texto;
}

/** Acá subir es COSTO: la suba fuerte va en rojo, la suba normal en warn y
 * la baja queda neutra (slate). Vive acá (no en top-cobradores.tsx, que
 * importa recharts) para que la página pueda usarla sin cargar el gráfico
 * — la tabla de variaciones reusa el mismo código de color. */
export function claseDelta(deltaPct: number) {
  if (deltaPct > 25) return 'text-danger';
  if (deltaPct > 0) return 'text-warn';
  return 'text-slate';
}
