'use client';

import { useState } from 'react';

export function DesaprobarDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-6">
        <h3 className="font-semibold text-neutral">Desaprobar registro</h3>
        <label className="block text-sm text-neutral">
          Motivo
          <textarea
            aria-label="Motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1 w-full rounded border border-neutral/40 px-2 py-1"
            rows={3}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-neutral">
            Cancelar
          </button>
          <button
            type="button"
            disabled={motivo.trim().length === 0}
            onClick={() => onConfirm(motivo.trim())}
            className="rounded bg-alert px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
