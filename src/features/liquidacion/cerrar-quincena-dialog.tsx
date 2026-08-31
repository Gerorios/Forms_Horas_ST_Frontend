'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useCierres, useCrearCierre, mensajeDeError, type CierreResumen } from '@/lib/api/liquidacion';

function nombreQuincena(quincena: number, mes: number, anio: number) {
  const nombreMes = new Date(2000, mes - 1, 1).toLocaleDateString('es-AR', { month: 'long' });
  return `${quincena === 1 ? '1ª' : '2ª'} quincena de ${nombreMes} ${anio}`;
}

function formatMoney(v: number) {
  return v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
}

/** Versión máxima ya existente para ese período exacto, o 0 si no hay ninguna
 * (la próxima a crear es esa +1). */
function versionMaxima(cierres: CierreResumen[] | undefined, anio: number, mes: number, quincena: number) {
  return (cierres ?? [])
    .filter((c) => c.anio === anio && c.mes === mes && c.quincena === quincena)
    .reduce((max, c) => Math.max(max, c.version), 0);
}

/**
 * Diálogo de confirmación para cerrar una quincena de liquidación (ver plan
 * 2026-08-30-cierre-liquidacion-export, §6.1). Muestra la versión que se va a
 * crear, los totales y las salvedades ya calculadas por la página de
 * detalle, y — en un recierre (v>1) — exige una nota antes de habilitar
 * "Confirmar". Al confirmar, crea el cierre y navega al panel de cierres.
 */
export function CerrarQuincenaDialog({
  anio,
  mes,
  quincena,
  totales,
  salvedades,
  onCancel,
}: {
  anio: number;
  mes: number;
  quincena: number;
  totales: { total: number; empleados: number };
  salvedades: string[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const { data: cierres } = useCierres();
  const crearCierre = useCrearCierre();
  const [nota, setNota] = useState('');

  const proximaVersion = versionMaxima(cierres, anio, mes, quincena) + 1;
  const esRecierre = proximaVersion > 1;
  const notaFalta = esRecierre && nota.trim().length === 0;

  function confirmar() {
    const dto = esRecierre ? { anio, mes, quincena, nota: nota.trim() } : { anio, mes, quincena };
    crearCierre.mutate(dto, {
      onSuccess: (cierre) => {
        router.push(`/liquidacion/cierres?nuevo=${cierre.id}`);
      },
      onError: (e) => toast.error(mensajeDeError(e, 'No se pudo cerrar la quincena')),
    });
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar quincena</DialogTitle>
          <DialogDescription>
            Vas a crear el cierre v{proximaVersion} de la {nombreQuincena(quincena, mes, anio)}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate">Total general</dt>
            <dd className="font-medium text-ink">{formatMoney(totales.total)}</dd>
          </div>
          <div>
            <dt className="text-slate">Empleados</dt>
            <dd className="font-medium text-ink">{totales.empleados}</dd>
          </div>
        </dl>

        {salvedades.length > 0 && (
          <div className="rounded-md bg-warn/10 p-3 text-sm text-warn">
            <p className="font-medium">Salvedades</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {salvedades.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {esRecierre && (
          <label className="block text-sm text-ink">
            Nota (obligatoria en un recierre)
            <textarea
              aria-label="Nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-line px-2 py-1"
            />
          </label>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={notaFalta || crearCierre.isPending} onClick={confirmar}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
