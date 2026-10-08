'use client';

import { Button } from '@/components/button';

/**
<<<<<<< HEAD
 * Un error de carga nunca se muestra como "no hay nada" (crítica 2026-10-08,
 * P1): dice qué no se pudo traer y ofrece reintentar. Con mala señal, un
 * "no hay reportes" hace creer que se perdieron los datos.
 */
export function ErrorCarga({ que, onReintentar, reintentando }: { que: string; onReintentar: () => void; reintentando?: boolean }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
      <p className="text-ink">
        <span className="font-semibold text-danger">No pudimos cargar {que}.</span> Revisá la conexión y probá de nuevo.
      </p>
      <Button variant="secondary" size="sm" onClick={onReintentar} disabled={reintentando} className="min-h-10 bg-surface">
        {reintentando ? 'Reintentando…' : 'Reintentar'}
=======
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
>>>>>>> feat/seguridad-critica-celular
      </Button>
    </div>
  );
}
