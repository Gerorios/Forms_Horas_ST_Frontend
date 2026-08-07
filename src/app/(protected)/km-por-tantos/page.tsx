'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import { useKmPorTantos, useCargarKmPorTantos, mensajeDeError } from '@/lib/api/liquidacion';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_OPCIONES = NOMBRES_MES.map((nombre, i) => ({ value: i + 1, label: nombre }));
const QUINCENA_OPCIONES = [
  { value: 1, label: '1ra (1 al 15)' },
  { value: 2, label: '2da (16 a fin de mes)' },
];

function quincenaActual(fecha: Date): 1 | 2 {
  return fecha.getDate() <= 15 ? 1 : 2;
}

export default function KmPorTantosPage() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [quincena, setQuincena] = useState<1 | 2>(quincenaActual(hoy));

  const { data, isLoading } = useKmPorTantos(anio, mes, quincena);
  const cargarKms = useCargarKmPorTantos();

  const [kmEdits, setKmEdits] = useState<Record<string, string>>({});

  // Igual criterio que /liquidacion/quincena/detalle: resincroniza solo
  // cuando cambia el período elegido, no en cada refetch de la misma
  // quincena (para no pisar lo que se está tipeando).
  const clavePeriodo = `${anio}-${mes}-${quincena}`;
  const syncKey = useRef('');
  useEffect(() => {
    if (!data || syncKey.current === clavePeriodo) return;
    syncKey.current = clavePeriodo;
    setKmEdits(Object.fromEntries(data.map((k) => [k.cuil, k.kmTotal ?? ''])));
  }, [data, clavePeriodo]);

  function guardarTodos() {
    const kms = (data ?? [])
      .filter((k) => kmEdits[k.cuil] !== undefined && kmEdits[k.cuil] !== '')
      .map((k) => ({ cuil: k.cuil, kmTotal: Number(kmEdits[k.cuil]) }));
    if (kms.length === 0) return;
    toast.promise(cargarKms.mutateAsync({ anio, mes, quincena, kms }), {
      loading: 'Guardando…',
      success: 'Km guardados',
      error: (e) => mensajeDeError(e, 'No se pudo guardar el km'),
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Km por tantos"
        action={
          <button
            type="button"
            onClick={guardarTodos}
            disabled={cargarKms.isPending || (data ?? []).length === 0}
            className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            {cargarKms.isPending ? 'Guardando…' : 'Guardar todos'}
          </button>
        }
      />
      <p className="text-sm text-slate">
        Cargá el total de km ejecutados por cada relevador en la quincena elegida. El Liquidador lo
        va a ver ya traducido a horas.
      </p>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <FiltroSelect
          label="Mes"
          value={mes}
          onChange={(v) => setMes(Number(v))}
          opciones={MESES_OPCIONES}
          opcional={false}
        />
        <FiltroNumero label="Año" value={anio} onChange={(v) => setAnio(Number(v) || anio)} className="w-24" />
        <FiltroSelect
          label="Quincena"
          value={quincena}
          onChange={(v) => setQuincena(Number(v) as 1 | 2)}
          opciones={QUINCENA_OPCIONES}
          opcional={false}
        />
      </div>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          No hay relevadores (régimen &quot;por tantos&quot;) cargados en Liquidación.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-2.5 font-medium">Relevador</th>
                <th className="px-4 py-2.5 font-medium">Km</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((k) => (
                <tr key={k.cuil} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 text-ink">{k.apellidoNombre}</td>
                  <td className="px-4 py-2.5">
                    <input
                      aria-label={`Km de ${k.apellidoNombre}`}
                      type="number"
                      min={0}
                      value={kmEdits[k.cuil] ?? ''}
                      onChange={(e) => setKmEdits((prev) => ({ ...prev, [k.cuil]: e.target.value }))}
                      className="w-28 rounded-md border border-line bg-surface px-2 py-1 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
