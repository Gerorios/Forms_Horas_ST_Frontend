import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid' | 'approve';
type Size = 'xs' | 'sm' | 'md';

const VARIANT_CLS: Record<Variant, string> = {
  primary: 'bg-brand text-ink hover:brightness-95',
  secondary: 'border border-line text-ink hover:bg-accent/60',
  // Sin borde — el "Cancelar" de los diálogos (no compite con el botón primario).
  ghost: 'text-slate hover:bg-accent/60',
  danger: 'border border-danger text-danger hover:bg-danger/10',
  'danger-solid': 'bg-danger text-white hover:brightness-95',
  // Aprobar algo que suma (Autogestión de la Seguridad): verde, no el dorado
  // de la marca, para que "suma puntos" se lea distinto de "acción principal".
  approve: 'bg-approved text-white hover:brightness-95',
};

// Los 3 tamaños que ya estaban en uso, copiados y pegados: xs en filas de
// tabla compactas, sm en toggles tipo "Editar ▾", md en Guardar/Cancelar.
const SIZE_CLS: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

/** Botón estándar de la app — centraliza las 4 variantes que ya se repetían
 * copiadas y pegadas en ~42 archivos (dorado primario, borde secundario,
 * borde peligro, sólido peligro) con las mismas clases exactas que ya
 * estaban en uso, para que el reemplazo sea 1:1 visualmente. */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      // Foco de teclado visible: el anillo global (dorado al 50 %) casi no se ve
      // sobre blanco; acá va sólido y separado del borde.
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 ${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${className}`}
      {...props}
    />
  );
}
