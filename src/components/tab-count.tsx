const TONO_CLS = {
  warn: 'bg-warn/15 text-warn',
  approved: 'bg-approved/15 text-approved',
  danger: 'bg-danger/15 text-danger',
} as const;

/** Pill numérica para pestañas de estado (Pendientes/Aprobados/Rechazados y
 * similares) — de un vistazo, cuántos hay en cada categoría sin tener que
 * entrar a cada pestaña. `undefined` mientras el dato todavía no cargó. */
export function TabCount({ value, tono }: { value: number | undefined; tono: keyof typeof TONO_CLS }) {
  if (value === undefined) return null;
  return (
    <span
      aria-hidden="true"
      className={`ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${TONO_CLS[tono]}`}
    >
      {value}
    </span>
  );
}
