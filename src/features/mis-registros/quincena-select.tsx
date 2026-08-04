'use client';

import { FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import type { Quincena } from '@/lib/quincena';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function QuincenaSelect({
  value,
  onChange,
}: {
  value: Quincena;
  onChange: (q: Quincena) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-3">
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
        value={value.parte}
        onChange={(v) => onChange({ ...value, parte: Number(v) as 1 | 2 })}
        opciones={[
          { value: 1, label: '1ª (1–15)' },
          { value: 2, label: '2ª (16–fin)' },
        ]}
        opcional={false}
      />
    </div>
  );
}
