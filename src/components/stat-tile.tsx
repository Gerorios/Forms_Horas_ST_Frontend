import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * Tile de indicador compartido (Central Sertec, ADR-025).
 *
 * Unifica los 5 `StatTile` locales y el `Indicador` del inicio, que hacían lo
 * mismo con APIs distintas. La unión de sus capacidades:
 *
 * - `tone` pinta el valor; `colorearSoloSiPositivo` reproduce la regla de
 *   control general: un 0 no es una alerta, se muestra en tinta.
 * - El tamaño del valor baja cuando el texto es largo (importes de
 *   certificaciones) para que no rompa la grilla; por eso `min-w-0` y
 *   `break-words`.
 * - Con `href` es un link, con `onClick` un botón, y si no un div.
 */
export type StatTone = 'ink' | 'ok' | 'warn' | 'danger' | 'manual' | 'neutral';

const COLOR_VALOR: Record<StatTone, string> = {
  ink: 'text-ink',
  neutral: 'text-ink',
  ok: 'text-approved',
  warn: 'text-warn',
  danger: 'text-danger',
  // Azul del "manual" de certificaciones: no es un estado del sistema de
  // colores, es la marca de la carga a mano.
  manual: 'text-[#3b6fc4]',
};

const CHIP_TONO: Record<StatTone, string> = {
  ink: 'bg-brand/20 text-brand-deep',
  neutral: 'bg-brand/20 text-brand-deep',
  ok: 'bg-brand/20 text-brand-deep',
  manual: 'bg-brand/20 text-brand-deep',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
};

/** A partir de acá el número no entra cómodo en una columna de la grilla. */
const LARGO_MAXIMO = 12;

export function StatTile({
  label,
  value,
  sub,
  tone,
  colorearSoloSiPositivo = false,
  icon,
  href,
  onClick,
  testId,
  animar = false,
}: {
  label: string;
  value: string | number;
  /** Línea chica debajo del valor (p. ej. "incluye 12 hs en otros contratos"). */
  sub?: ReactNode;
  tone?: StatTone;
  /** Colorea el valor solo cuando hay algo que atender (número > 0). */
  colorearSoloSiPositivo?: boolean;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  testId?: string;
  /** Animación de entrada (tableros que cargan datos de a poco). */
  animar?: boolean;
}) {
  const tono: StatTone = tone ?? 'ink';
  const apagado = colorearSoloSiPositivo && !(typeof value === 'number' && value > 0);
  const colorValor = apagado ? COLOR_VALOR.ink : COLOR_VALOR[tono];
  const tamañoValor =
    String(value).length > LARGO_MAXIMO ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl';

  const clickeable = Boolean(href || onClick);
  const clases = [
    'min-w-0 rounded-xl border border-line bg-surface p-4 text-left',
    clickeable ? 'transition hover:-translate-y-0.5 hover:border-brand/40' : '',
    animar ? 'animate-in fade-in-0 slide-in-from-bottom-1 duration-300' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const contenido = (
    <>
      <div className="flex items-center gap-2">
        {icon && (
          <span
            className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg ${CHIP_TONO[tono]}`}
          >
            {icon}
          </span>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      </div>
      <p
        data-testid={testId}
        className={`mt-1.5 break-words font-display font-semibold tabular-nums ${tamañoValor} ${colorValor}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 break-words text-xs tabular-nums text-slate">{sub}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={clases}>
        {contenido}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={clases}>
        {contenido}
      </button>
    );
  }
  return <div className={clases}>{contenido}</div>;
}
