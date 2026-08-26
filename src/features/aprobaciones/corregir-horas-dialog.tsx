'use client';

import { useState } from 'react';
import { Button } from '@/components/button';

export function CorregirHorasDialog({
  horasActuales,
  onConfirm,
  onCancel,
}: {
  horasActuales: number;
  onConfirm: (horasCorregidas: number, motivo: string) => void;
  onCancel: () => void;
}) {
  const [horas, setHoras] = useState(String(horasActuales));
  const [motivo, setMotivo] = useState('');

  const horasNum = horas === '' ? null : Number(horas);
  const puedeConfirmar = horasNum != null && horasNum > 0 && motivo.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">Corregir horas</h3>
        <p className="text-xs text-slate">
          Se rechazan las {horasActuales} hs declaradas y se crea una carga nueva, ya aprobada,
          con la hora corregida — para todos los operarios de esta línea.
        </p>
        <label className="flex flex-col text-sm font-medium text-ink">
          Horas corregidas
          <input
            aria-label="Horas corregidas"
            type="number"
            min="0"
            step="0.5"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-ink">
          Motivo
          <textarea
            aria-label="Motivo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: se declararon 12hs, el recorrido registrado muestra 8hs"
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!puedeConfirmar} onClick={() => onConfirm(horasNum!, motivo.trim())}>
            Confirmar corrección
          </Button>
        </div>
      </div>
    </div>
  );
}
