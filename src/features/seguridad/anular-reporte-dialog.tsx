'use client';

import { useState } from 'react';
import { Button } from '@/components/button';

/** El autor retira su reporte pendiente (duplicado o error). Mismo patrón que
 * AnularNovedadDialog: motivo obligatorio. Sin la casilla de confirmación:
 * anular un reporte propio no tiene consecuencias para nadie más. */
export function AnularReporteDialog({
  onCancel,
  onConfirmar,
  anulando,
}: {
  onCancel: () => void;
  onConfirmar: (motivo: string) => void;
  anulando: boolean;
}) {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div role="dialog" aria-label="Anular reporte" className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">Anular reporte</h3>
        <p className="text-sm text-slate">Queda guardado como anulado y no suma puntos.</p>
        <label className="flex flex-col text-sm font-medium text-ink">
          ¿Por qué lo anulás?
          <textarea
            aria-label="Motivo de anulación"
            rows={3}
            value={motivo}
            placeholder="Ej.: lo mandé dos veces"
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 sm:text-sm"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger-solid" disabled={motivo.trim() === '' || anulando} onClick={() => onConfirmar(motivo.trim())}>
            Anular reporte
          </Button>
        </div>
      </div>
    </div>
  );
}
