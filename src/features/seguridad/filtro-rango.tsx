'use client';

import type { RangoConsulta } from '@/lib/api/seguridad';
import { fechaCorta, hoyLocal } from './tipos';

/** Sin períodos guardados (ADR-027, revisión 2026-10-08): cada uno elige el
 * rango que quiere ver. Por defecto, el año en curso. */
export type ModoRango = 'anio' | 'semestre' | 'trimestre' | 'mes' | 'libre';

export interface FiltroRangoValor {
  modo: ModoRango;
  desde: string;
  hasta: string;
}

export const RANGO_INICIAL: FiltroRangoValor = { modo: 'anio', desde: '', hasta: '' };

const ETIQUETAS: Record<ModoRango, string> = {
  anio: 'Este año',
  semestre: 'Este semestre',
  trimestre: 'Este trimestre',
  mes: 'Este mes',
  libre: 'Otro rango',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** El rango de un atajo, hasta hoy. 'libre' usa las fechas elegidas. */
export function rangoDe(v: FiltroRangoValor, hoy: string = hoyLocal()): RangoConsulta {
  const [anio, mes] = hoy.split('-').map(Number);
  const desdeMes = (m: number) => `${anio}-${pad(m)}-01`;
  switch (v.modo) {
    case 'anio':
      return { desde: desdeMes(1), hasta: hoy };
    case 'semestre':
      return { desde: desdeMes(mes <= 6 ? 1 : 7), hasta: hoy };
    case 'trimestre':
      return { desde: desdeMes(Math.floor((mes - 1) / 3) * 3 + 1), hasta: hoy };
    case 'mes':
      return { desde: desdeMes(mes), hasta: hoy };
    case 'libre':
      return { ...(v.desde ? { desde: v.desde } : {}), ...(v.hasta ? { hasta: v.hasta } : {}) };
  }
}

export function textoRango(r: { desde?: string; hasta?: string }): string {
  if (!r.desde && !r.hasta) return '';
  return `${r.desde ? fechaCorta(r.desde) : '…'} al ${r.hasta ? fechaCorta(r.hasta) : 'hoy'}`;
}

const CAMPO = 'min-h-11 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

export function FiltroRango({ valor, onChange }: { valor: FiltroRangoValor; onChange: (v: FiltroRangoValor) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate">
        Rango
        <select aria-label="Rango" value={valor.modo} onChange={(e) => onChange({ ...valor, modo: e.target.value as ModoRango })} className={CAMPO}>
          {(Object.keys(ETIQUETAS) as ModoRango[]).map((m) => (
            <option key={m} value={m}>
              {ETIQUETAS[m]}
            </option>
          ))}
        </select>
      </label>
      {valor.modo === 'libre' && (
        <>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate">
            Desde
            <input type="date" aria-label="Desde" value={valor.desde} onChange={(e) => onChange({ ...valor, desde: e.target.value })} className={CAMPO} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate">
            Hasta
            <input type="date" aria-label="Hasta" value={valor.hasta} onChange={(e) => onChange({ ...valor, hasta: e.target.value })} className={CAMPO} />
          </label>
        </>
      )}
    </div>
  );
}
