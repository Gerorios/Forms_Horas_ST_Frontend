'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ReporteSeguridad } from '@/lib/api/seguridad';
import { TIPO_LABEL, fechaCorta } from './tipos';

/** El autor retira su reporte pendiente (duplicado o error). Diálogo del
 * sistema (Esc, foco y aria-modal) que nombra qué reporte se anula; motivo
 * obligatorio. Sin casilla de confirmación: anular un reporte propio no tiene
 * consecuencias para nadie más. */
export function AnularReporteDialog({
  reporte,
  onCancel,
  onConfirmar,
  anulando,
}: {
  reporte: Pick<ReporteSeguridad, 'tipo' | 'fechaReporte'>;
  onCancel: () => void;
  onConfirmar: (motivo: string) => void;
  anulando: boolean;
}) {
  const [motivo, setMotivo] = useState('');
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular reporte</DialogTitle>
          <DialogDescription>
            {TIPO_LABEL[reporte.tipo]} del {fechaCorta(reporte.fechaReporte)}. Queda guardado como anulado y no suma puntos.
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col text-sm font-medium text-ink">
          ¿Por qué lo anulás?
          <textarea
            aria-label="Motivo de anulación"
            rows={3}
            value={motivo}
            placeholder="Ej.: lo mandé dos veces"
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand-deep focus:ring-2 focus:ring-brand/40 sm:text-sm"
          />
        </label>
        <DialogFooter>
          <Button variant="ghost" className="min-h-11" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger-solid" className="min-h-11" disabled={motivo.trim() === '' || anulando} onClick={() => onConfirmar(motivo.trim())}>
            {anulando ? 'Anulando…' : 'Anular reporte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
