'use client';

import { FiltroFecha, FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import type { PeriodoPanel } from '@/lib/api/panel-general';
import { rangoQuincenaISO, type Quincena } from '@/lib/quincena';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Mismo tope que el back (ADR-030). */
export const MAX_MESES_RANGO = 12;

/** Error del rango desde/hasta, o null si está vacío o es válido. Las fechas
 * son YYYY-MM-DD: se comparan como texto. */
export function errorRango(desde: string | undefined, hasta: string | undefined): string | null {
  if (!desde && !hasta) return null;
  if (!desde || !hasta) return 'Completá las dos fechas del rango.';
  if (hasta < desde) return 'La fecha hasta no puede ser anterior a la fecha desde.';
  const [y, m, d] = desde.split('-').map(Number);
  const tope = new Date(y, m - 1 + MAX_MESES_RANGO, d - 1);
  const topeISO = `${tope.getFullYear()}-${String(tope.getMonth() + 1).padStart(2, '0')}-${String(tope.getDate()).padStart(2, '0')}`;
  if (hasta > topeISO) return `El rango no puede superar los ${MAX_MESES_RANGO} meses.`;
  return null;
}

/** El período que se consulta: un rango incompleto o inválido no se manda
 * (queda el mes elegido) — el error se muestra en la barra. */
export function periodoEfectivo(p: PeriodoPanel): PeriodoPanel {
  if (p.desde && p.hasta && !errorRango(p.desde, p.hasta)) return p;
  return { anio: p.anio, mes: p.mes, parte: p.parte };
}

/** La quincena del período, o null si es un mes completo o un rango que no
 * coincide con una quincena (mismo criterio que el back). */
export function quincenaDelPeriodo(p: PeriodoPanel): Quincena | null {
  if (p.desde && p.hasta) {
    const [y, m, d] = p.desde.split('-').map(Number);
    if (d !== 1 && d !== 16) return null;
    const q: Quincena = { anio: y, mes: m, parte: d === 1 ? 1 : 2 };
    const r = rangoQuincenaISO(q);
    return r.desde === p.desde && r.hasta === p.hasta ? q : null;
  }
  return p.parte ? { anio: p.anio, mes: p.mes, parte: p.parte } : null;
}

/** Campos del período de Control general (ADR-030): mes, año y quincena
 * opcional ("Mes completo"), o desde/hasta, que manda sobre el mes. Sin
 * tarjeta: van dentro de la barra de filtros de la página. */
export function PeriodoCampos({
  value,
  onChange,
}: {
  value: PeriodoPanel;
  onChange: (p: PeriodoPanel) => void;
}) {
  const rangoActivo = Boolean(value.desde && value.hasta);
  return (
    <>
      <div
        className={`flex flex-wrap items-end gap-2 transition-opacity ${rangoActivo ? 'opacity-50' : ''}`}
        title={rangoActivo ? 'Con fecha desde y hasta completas, manda el rango.' : undefined}
      >
        <FiltroSelect
          label="Mes"
          value={value.mes}
          onChange={(v) => onChange({ ...value, mes: Number(v) })}
          opciones={MESES.map((m, i) => ({ value: i + 1, label: m }))}
          opcional={false}
        />
        <FiltroNumero
          label="Año"
          value={value.anio}
          onChange={(v) => onChange({ ...value, anio: Number(v) })}
          className="w-24"
        />
        <FiltroSelect
          label="Quincena"
          value={value.parte ?? ''}
          onChange={(v) => onChange({ ...value, parte: v ? (Number(v) as 1 | 2) : null })}
          opciones={[
            { value: 1, label: '1ª (1–15)' },
            { value: 2, label: '2ª (16–fin)' },
          ]}
          placeholder="Mes completo"
        />
      </div>
      <FiltroFecha
        label="Desde"
        ariaLabel="Fecha desde"
        value={value.desde ?? ''}
        onChange={(v) => onChange({ ...value, desde: v })}
      />
      <FiltroFecha
        label="Hasta"
        ariaLabel="Fecha hasta"
        value={value.hasta ?? ''}
        onChange={(v) => onChange({ ...value, hasta: v })}
      />
    </>
  );
}
