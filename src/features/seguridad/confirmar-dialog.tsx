'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/button';

/**
 * Confirmación de una acción que afecta a personas: dice qué pasa y a quién,
 * y el botón lleva el verbo. Sobre `ui/dialog`: Esc, foco atrapado y
 * aria-modal vienen de base-ui.
 */
export function ConfirmarDialog({
  titulo,
  detalle,
  afectados = [],
  verbo,
  variante = 'primary',
  ocupado,
  onConfirmar,
  onCancelar,
  children,
}: {
  titulo: string;
  detalle: ReactNode;
  afectados?: string[];
  verbo: string;
  variante?: 'primary' | 'approve' | 'danger-solid';
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCancelar()}>
      <DialogContent showCloseButton={false} className="bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-ink">{titulo}</DialogTitle>
          <DialogDescription className="text-sm text-slate">{detalle}</DialogDescription>
        </DialogHeader>
        {afectados.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">{afectados.length === 1 ? 'Afecta a:' : `Afecta a ${afectados.length} personas:`}</p>
            <ul className="max-h-48 space-y-0.5 overflow-y-auto rounded-md bg-sand-deep px-3 py-2 text-sm text-ink">
              {afectados.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}
        {children}
        <DialogFooter className="bg-sand">
          <Button variant="ghost" onClick={onCancelar} disabled={ocupado} className="min-h-11">
            Cancelar
          </Button>
          <Button variant={variante} onClick={onConfirmar} disabled={ocupado} className="min-h-11 font-semibold">
            {verbo}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
