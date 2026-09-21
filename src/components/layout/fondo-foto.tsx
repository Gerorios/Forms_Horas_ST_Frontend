import Image from 'next/image';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type FondoFotoProps = {
  /** Ruta de la foto en `public/` (ver `src/lib/fotos.ts`). Sin foto va el marcador. */
  src?: string | null;
  /** Clases del contenedor (borde, radio, márgenes…). */
  className?: string;
  /** Clases de alto del contenedor, ej. `'h-[300px]'` o `'min-h-screen'`. */
  alto?: string;
  /**
   * Precargar la foto (`priority` de `next/image`). Default `true` para la
   * franja del inicio; el login la pasa en `false` para no competir con el
   * formulario en móviles.
   */
  prioridad?: boolean;
  children?: ReactNode;
};

/**
 * Franja/pantalla con foto de fondo y el tratamiento único del ADR-025: la foto
 * siempre va oscurecida hacia grafito con una luz dorada arriba a la derecha,
 * para que fotos distintas se lean como una sola familia. Sin `src` quedan solo
 * los velos, que son el marcador hasta que lleguen las fotos reales.
 *
 * El velo grafito es opaco abajo a la izquierda (donde va el texto blanco:
 * velo ≥ 55 %, ADR-025) y se abre hasta el 40 % arriba a la derecha.
 */
export function FondoFoto({ src, className, alto, prioridad = true, children }: FondoFotoProps) {
  return (
    <div className={cn('relative overflow-hidden bg-graphite text-white', alto, className)}>
      {src ? (
        <Image src={src} alt="" fill priority={prioridad} sizes="100vw" className="object-cover" />
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-tr from-graphite from-15% via-graphite/75 via-55% to-graphite-2/40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(120%_90%_at_80%_10%,var(--color-brand)_0%,transparent_55%)]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
