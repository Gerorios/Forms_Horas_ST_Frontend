'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import type { PeriodoInput } from '@/lib/api/seguridad';

const CAMPO = 'min-h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

/** Formulario de un período: el backend valida que no se superponga con otro
 * (un reporte caería en dos rankings) y muestra el error tal cual. */
export function PeriodoForm({
  inicial,
  enviando,
  onGuardar,
  onCancelar,
  textoBoton,
}: {
  inicial?: PeriodoInput;
  enviando: boolean;
  onGuardar: (p: PeriodoInput) => void;
  onCancelar?: () => void;
  textoBoton: string;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [desde, setDesde] = useState(inicial?.desde ?? '');
  const [hasta, setHasta] = useState(inicial?.hasta ?? '');
  const alReves = desde !== '' && hasta !== '' && hasta < desde;
  const valido = nombre.trim() !== '' && desde !== '' && hasta !== '' && !alReves;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-slate">
          Nombre
          <input aria-label="Nombre" value={nombre} placeholder="Ej.: 1er semestre 2027" onChange={(e) => setNombre(e.target.value)} className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate">
          Desde
          <input aria-label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate">
          Hasta
          <input aria-label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={CAMPO} />
        </label>
        <Button variant="primary" disabled={!valido || enviando} onClick={() => onGuardar({ nombre: nombre.trim(), desde, hasta })}>
          {enviando ? 'Guardando…' : textoBoton}
        </Button>
        {onCancelar && (
          <Button variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </div>
      {alReves && (
        <p role="alert" className="text-sm text-danger">
          El período termina antes de empezar.
        </p>
      )}
    </div>
  );
}

