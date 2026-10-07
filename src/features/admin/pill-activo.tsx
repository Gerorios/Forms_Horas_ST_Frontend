'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/button';

/**
 * Estado activo/inactivo de un registro de catálogo.
 *
 * Hotfix 2026-10-07 (revisión de diseño A1): se ve como una etiqueta, así que
 * un clic suelto no puede cambiar el estado. El clic abre una confirmación que
 * nombra el registro y el efecto; recién al confirmar se llama a `onToggle`.
 * Desactivar un usuario lo deja sin poder entrar, por eso cada pantalla puede
 * pasar su `efecto`.
 */
export function PillActivo({
  activo,
  onToggle,
  disabled,
  nombre,
  efecto,
}: {
  activo: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Qué registro se cambia (aparece en la confirmación). */
  nombre?: string;
  /** Qué pasa al desactivar; si falta, se usa un texto general. */
  efecto?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const verbo = activo ? 'Desactivar' : 'Activar';
  const registro = nombre ? `«${nombre}»` : 'este registro';
  const consecuencia = activo
    ? (efecto ?? 'Deja de estar disponible para elegirlo. Se puede volver a activar.')
    : 'Vuelve a estar disponible.';

  function confirmar() {
    setConfirmando(false);
    onToggle();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        disabled={disabled}
        aria-haspopup="dialog"
        className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition disabled:opacity-50 ${
          activo
            ? 'bg-approved/10 text-approved ring-approved/25 hover:bg-approved/20'
            : 'bg-slate/10 text-slate ring-slate/25 hover:bg-slate/20'
        }`}
      >
        {activo ? 'Activo' : 'Inactivo'}
      </button>

      {confirmando && (
        <Dialog open onOpenChange={(abierto) => !abierto && setConfirmando(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {verbo} {registro}
              </DialogTitle>
              <DialogDescription>{consecuencia}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button variant={activo ? 'danger-solid' : 'primary'} onClick={confirmar}>
                {verbo}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
