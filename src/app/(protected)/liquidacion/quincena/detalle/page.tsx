'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import {
  useDetalleQuincena,
  useMontosMensualizados,
  useCargarMontosMensualizados,
  useKmPorTantos,
  useCargarKmPorTantos,
} from '@/lib/api/liquidacion';
import { FilaEmpleado } from '@/features/liquidacion/fila-empleado';

function nombreQuincena(quincena: number, mes: number, anio: number) {
  const nombreMes = new Date(2000, mes - 1, 1).toLocaleDateString('es-AR', { month: 'long' });
  return `Quincena ${quincena === 1 ? '1ra' : '2da'} de ${nombreMes} ${anio}`;
}

export default function DetalleQuincenaPage() {
  const searchParams = useSearchParams();
  const anio = Number(searchParams.get('anio'));
  const mes = Number(searchParams.get('mes'));
  const quincena = Number(searchParams.get('q')) as 1 | 2;
  const periodoValido = Boolean(anio && mes && quincena);

  const { data, isLoading } = useDetalleQuincena(anio, mes, quincena, periodoValido);
  const { data: montosMensualizados } = useMontosMensualizados(anio, mes, quincena);
  const cargarMontos = useCargarMontosMensualizados();
  const { data: kmsPorTantos } = useKmPorTantos(anio, mes, quincena);
  const cargarKms = useCargarKmPorTantos();

  const [montoEdits, setMontoEdits] = useState<Record<string, string>>({});
  const [kmEdits, setKmEdits] = useState<Record<string, string>>({});

  // Los edits se resincronizan solo cuando cambia la quincena elegida, no en
  // cada refetch de la misma quincena (evita pisar lo que se está tipeando).
  const clavePeriodo = `${anio}-${mes}-${quincena}`;
  const montosSyncKey = useRef('');
  useEffect(() => {
    if (!montosMensualizados || montosSyncKey.current === clavePeriodo) return;
    montosSyncKey.current = clavePeriodo;
    setMontoEdits(Object.fromEntries(montosMensualizados.map((m) => [m.cuil, m.monto ?? ''])));
  }, [montosMensualizados, clavePeriodo]);

  const kmsSyncKey = useRef('');
  useEffect(() => {
    if (!kmsPorTantos || kmsSyncKey.current === clavePeriodo) return;
    kmsSyncKey.current = clavePeriodo;
    setKmEdits(Object.fromEntries(kmsPorTantos.map((k) => [k.cuil, k.kmTotal ?? ''])));
  }, [kmsPorTantos, clavePeriodo]);

  function guardarMonto(cuil: string) {
    const v = montoEdits[cuil];
    if (v === undefined || v === '') return;
    toast.promise(cargarMontos.mutateAsync({ anio, mes, quincena, montos: [{ cuil, monto: Number(v) }] }), {
      loading: 'Guardando monto…',
      success: 'Monto guardado',
      error: 'No se pudo guardar',
    });
  }

  function guardarKm(cuil: string) {
    const v = kmEdits[cuil];
    if (v === undefined || v === '') return;
    toast.promise(cargarKms.mutateAsync({ anio, mes, quincena, kms: [{ cuil, kmTotal: Number(v) }] }), {
      loading: 'Guardando km…',
      success: 'Km guardado',
      error: 'No se pudo guardar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Liquidador" title={nombreQuincena(quincena, mes, anio)} />

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-3 py-2.5 font-medium">Empleado</th>
                <th className="px-3 py-2.5 font-medium">Régimen</th>
                <th className="px-3 py-2.5 font-medium">Categoría</th>
                <th className="px-3 py-2.5 font-medium">Hs</th>
                <th className="px-3 py-2.5 font-medium">Básico</th>
                <th className="px-3 py-2.5 font-medium">Extras</th>
                <th className="px-3 py-2.5 font-medium">Presentismo</th>
                <th className="px-3 py-2.5 font-medium">Plus</th>
                <th className="px-3 py-2.5 font-medium">Bono</th>
                <th className="px-3 py-2.5 font-medium">TOTAL</th>
                <th className="px-3 py-2.5 font-medium">Alertas</th>
                <th className="px-3 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(data?.filas ?? []).map((f) => (
                <FilaEmpleado
                  key={f.cuil}
                  fila={f}
                  montoEdit={montoEdits[f.cuil] ?? ''}
                  onMontoEditChange={(v) => setMontoEdits((prev) => ({ ...prev, [f.cuil]: v }))}
                  onGuardarMonto={() => guardarMonto(f.cuil)}
                  guardandoMonto={cargarMontos.isPending}
                  kmEdit={kmEdits[f.cuil] ?? ''}
                  onKmEditChange={(v) => setKmEdits((prev) => ({ ...prev, [f.cuil]: v }))}
                  onGuardarKm={() => guardarKm(f.cuil)}
                  guardandoKm={cargarKms.isPending}
                />
              ))}
              {(data?.sinPerfil ?? []).map((e) => (
                <tr key={e.cuil} className="border-b border-line bg-sand/60 text-slate last:border-0">
                  <td className="px-3 py-2.5">{e.nombre}</td>
                  <td className="px-3 py-2.5" colSpan={7}>
                    {e.motivo === 'sin_perfil' ? 'Sin perfil de liquidación asignado' : 'Perfil incompleto'} —{' '}
                    {e.horasAprobadas}hs aprobadas
                  </td>
                  <td className="px-3 py-2.5" colSpan={4}>
                    <Link href="/liquidacion/perfiles" className="underline">
                      Ir a Perfiles de empleados →
                    </Link>
                  </td>
                </tr>
              ))}
              {(data?.filas ?? []).length === 0 && (data?.sinPerfil ?? []).length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-3 text-sm text-slate">
                    Sin empleados en esta quincena.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
