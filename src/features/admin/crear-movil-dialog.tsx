'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/button';
import { useCrearMovil } from '@/lib/api/admin';

const inputCls =
  'mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

/** Alta de un móvil. El padre lo monta solo cuando hace falta (`{creando && …}`)
 * y lo desmonta con `onClose`, igual que CerrarQuincenaDialog: así el formulario
 * arranca limpio en cada apertura. */
export function CrearMovilDialog({ onClose }: { onClose: () => void }) {
  const crear = useCrearMovil();
  const [patente, setPatente] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const puedeCrear = patente.trim() !== '' && !crear.isPending;

  async function confirmar() {
    if (!puedeCrear) return;
    // Se guarda tal cual se escribe. No se normaliza a [A-Z0-9] porque el
    // identificador no siempre es una patente: en la flota hay "TACHO PAÑOL",
    // "S/N" y "HQJ 539", que normalizados se juntarían y perderían la Ñ. El
    // buscador sí normaliza los dos lados, así que igual se encuentran.
    const promesa = crear.mutateAsync({
      identificador: patente.trim(),
      descripcion: descripcion.trim() || undefined,
    });
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Móvil creado',
      error: 'No se pudo crear',
    });
    try {
      await promesa;
      onClose();
    } catch {
      // El toast ya avisó; el modal queda abierto para corregir la patente.
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir móvil</DialogTitle>
          <DialogDescription>
            La patente es obligatoria — o un nombre, si el móvil no tiene (S/N, TACHO PAÑOL).
          </DialogDescription>
        </DialogHeader>

        <label className="block text-sm font-medium text-ink">
          Patente
          <input
            aria-label="Patente"
            value={patente}
            onChange={(e) => setPatente(e.target.value)}
            placeholder="AB123CD"
            className={inputCls}
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Descripción (opcional)
          <input
            aria-label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Camioneta Toyota Hilux"
            className={inputCls}
          />
        </label>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!puedeCrear} onClick={confirmar}>
            {crear.isPending ? 'Guardando…' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
