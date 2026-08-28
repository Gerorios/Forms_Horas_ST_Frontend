/** Placeholder pulsante — reemplaza el "Cargando…" de texto plano. Usa
 * `bg-slate` (token que ya cambia con el modo oscuro) y `animate-pulse`
 * (neutralizado por la regla global de prefers-reduced-motion en globals.css). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate/15 ${className}`} aria-hidden />;
}

/** Placeholder de una tabla: filas de barras grises con el mismo contenedor
 * (borde + esquinas) que las tablas reales, para que no "salte" el layout
 * cuando llegan los datos. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface" role="status" aria-label="Cargando…">
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-line last:border-0">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <Skeleton className={`h-4 ${c === 0 ? 'w-28' : 'w-full max-w-[120px]'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Placeholder de una grilla de tiles (stat tiles, resumen). */
export function TilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="status" aria-label="Cargando…">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2.5 h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder de bloque de texto/panel (detalle, formulario). */
export function BlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando…">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** Placeholder de una lista de cards (mismo patrón que registros-cards.tsx). */
export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando…">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
        </div>
      ))}
    </div>
  );
}
