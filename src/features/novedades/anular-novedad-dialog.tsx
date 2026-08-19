'use client';

import { useState } from 'react';

/** Confirmación de anulación de una novedad (PATCH /novedades/:id/anular) —
 * mismo patrón que AnularCargaDialog (features/combustible/detalle-carga.tsx):
 * motivo obligatorio + checkbox de confirmación, botón de submit rojo
 * deshabilitado hasta que ambos estén completos. */
export function AnularNovedadDialog({
  onCancel,
  onConfirmar,
  anulando,
}: {
  onCancel: () => void;
  onConfirmar: (motivo: string) => void;
  anulando: boolean;
}) {
  const [motivo, setMotivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">Anular novedad</h3>
        <label className="flex flex-col text-sm font-medium text-ink">
          Motivo
          <textarea
            aria-label="Motivo de anulación"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-ink">
          <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
          Confirmo que quiero anular esta novedad
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-slate hover:bg-accent/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={motivo.trim() === '' || !confirmado || anulando}
            onClick={() => onConfirmar(motivo.trim())}
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-50"
          >
            Anular novedad
          </button>
        </div>
      </div>
    </div>
  );
}
