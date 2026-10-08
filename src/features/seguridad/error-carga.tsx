'use client';

import { Button } from '@/components/button';

/**
 * Un error de carga nunca se muestra como "vacío": con mala señal, "todavía
 * no enviaste ningún reporte" haría creer que se perdieron los reportes o los
 * puntos. Dice qué no se pudo cargar y ofrece reintentar.
 */
export function ErrorCarga({ que, onReintentar, oscuro }: { que: string; onReintentar: () => void; oscuro?: boolean }) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
        oscuro ? 'border-white/20 bg-graphite text-white' : 'border-danger/30 bg-danger/5 text-ink'
      }`}
    >
      <p>
        <span className="font-semibold">No pudimos cargar {que}.</span> Revisá la señal y probá de nuevo.
      </p>
      <Button variant="secondary" className={`min-h-11 ${oscuro ? 'border-white/40 text-white hover:bg-white/10' : 'bg-surface'}`} onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
