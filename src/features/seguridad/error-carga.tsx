'use client';

import { Button } from '@/components/button';

/**
 * Un error de carga nunca se muestra como "no hay nada" (crítica 2026-10-08,
 * P1): con mala señal, "todavía no enviaste ningún reporte" o "no hay
 * reportes" hace creer que se perdieron los datos o los puntos. Dice qué no
 * se pudo traer y ofrece reintentar. `oscuro`: sobre la tarjeta grafito de
 * puntos.
 */
export function ErrorCarga({
  que,
  onReintentar,
  reintentando,
  oscuro,
}: {
  que: string;
  onReintentar: () => void;
  reintentando?: boolean;
  oscuro?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
        oscuro ? 'border-white/20 bg-graphite text-white' : 'border-danger/30 bg-danger/5 text-ink'
      }`}
    >
      <p>
        <span className={`font-semibold ${oscuro ? '' : 'text-danger'}`}>No pudimos cargar {que}.</span> Revisá la conexión y
        probá de nuevo.
      </p>
      <Button
        variant="secondary"
        disabled={reintentando}
        className={`min-h-11 ${oscuro ? 'border-white/40 text-white hover:bg-white/10' : 'bg-surface'}`}
        onClick={onReintentar}
      >
        {reintentando ? 'Reintentando…' : 'Reintentar'}
      </Button>
    </div>
  );
}
