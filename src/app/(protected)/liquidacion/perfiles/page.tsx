'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { useCategoriasUocra } from '@/lib/api/liquidacion';
import {
  usePerfilesLiquidacion,
  useUpsertPerfilLiquidacion,
  useEliminarPerfilLiquidacion,
  type RegimenLiquidacion,
  type ModalidadHoraExtra,
} from '@/lib/api/liquidacion';
import type { EmpleadoBusqueda } from '@/types/domain';

const REGIMEN_LABEL: Record<RegimenLiquidacion, string> = {
  jornalizado: 'Jornalizado (por horas)',
  fijo: 'Fijo (88hs por quincena)',
  por_tantos: 'Por tantos (por cantidad)',
};

const MODALIDAD_EXTRA_LABEL: Record<ModalidadHoraExtra, string> = {
  en_b: 'En B (sin descuentos)',
  con_descuentos: 'Con descuentos (sueldo formal)',
};

export default function PerfilesLiquidacionPage() {
  const { data: perfiles, isLoading } = usePerfilesLiquidacion();
  const { data: categorias } = useCategoriasUocra();
  const upsert = useUpsertPerfilLiquidacion();
  const eliminar = useEliminarPerfilLiquidacion();

  const [empleado, setEmpleado] = useState<EmpleadoBusqueda[]>([]);
  const [regimen, setRegimen] = useState<RegimenLiquidacion | ''>('');
  const [categoriaUocraId, setCategoriaUocraId] = useState<number | null>(null);
  const [modalidadHoraExtra, setModalidadHoraExtra] = useState<ModalidadHoraExtra | ''>('');

  const puede = empleado.length === 1 && regimen !== '';

  function asignar() {
    if (!puede) return;
    const promesa = upsert.mutateAsync({
      cuil: empleado[0].cuil,
      regimen: regimen as RegimenLiquidacion,
      categoriaUocraId: categoriaUocraId ?? undefined,
      modalidadHoraExtra: modalidadHoraExtra || undefined,
    });
    toast.promise(promesa, { loading: 'Guardando…', success: 'Perfil asignado', error: 'No se pudo asignar' });
    promesa
      .then(() => {
        setEmpleado([]);
        setRegimen('');
        setCategoriaUocraId(null);
        setModalidadHoraExtra('');
      })
      .catch(() => {});
  }

  function quitar(cuil: string) {
    toast.promise(eliminar.mutateAsync(cuil), {
      loading: 'Quitando…',
      success: 'Perfil quitado del panel de liquidación',
      error: 'No se pudo quitar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Perfiles de empleados" />
      <p className="text-sm text-slate">
        Solo los empleados con un perfil asignado acá aparecen en el panel de liquidación
        (los administrativos, por ejemplo, quedan afuera al no tener ninguno).
      </p>

      <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <div className="space-y-1">
          <span className="text-sm font-medium text-ink">Empleado</span>
          <OperariosSelect value={empleado} onChange={(v) => setEmpleado(v.slice(-1))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Régimen
            <select
              aria-label="Régimen"
              value={regimen}
              onChange={(e) => setRegimen(e.target.value as RegimenLiquidacion | '')}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">—</option>
              {(Object.keys(REGIMEN_LABEL) as RegimenLiquidacion[]).map((r) => (
                <option key={r} value={r}>{REGIMEN_LABEL[r]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Categoría UOCRA
            <select
              aria-label="Categoría UOCRA"
              value={categoriaUocraId ?? ''}
              onChange={(e) => setCategoriaUocraId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">— (no aplica, ej. por tantos)</option>
              {(categorias ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Modalidad de hora extra
            <select
              aria-label="Modalidad de hora extra"
              value={modalidadHoraExtra}
              onChange={(e) => setModalidadHoraExtra(e.target.value as ModalidadHoraExtra | '')}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">— (no aplica)</option>
              {(Object.keys(MODALIDAD_EXTRA_LABEL) as ModalidadHoraExtra[]).map((m) => (
                <option key={m} value={m}>{MODALIDAD_EXTRA_LABEL[m]}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={!puede || upsert.isPending}
          onClick={asignar}
          className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
        >
          Asignar
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-2.5 font-medium">Empleado</th>
                <th className="px-4 py-2.5 font-medium">Régimen</th>
                <th className="px-4 py-2.5 font-medium">Categoría</th>
                <th className="px-4 py-2.5 font-medium">Hora extra</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(perfiles ?? []).map((p) => (
                <tr key={p.cuil} className="border-b border-line text-ink last:border-0">
                  <td className="px-4 py-2.5">{p.empleado.apellido_nombre}</td>
                  <td className="px-4 py-2.5">{REGIMEN_LABEL[p.regimen]}</td>
                  <td className="px-4 py-2.5">{p.categoria?.nombre ?? '—'}</td>
                  <td className="px-4 py-2.5">{p.modalidadHoraExtra ? MODALIDAD_EXTRA_LABEL[p.modalidadHoraExtra] : '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => quitar(p.cuil)}
                      className="rounded-md px-2 py-1 text-xs text-danger transition hover:bg-danger/10"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
              {(perfiles ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm text-slate">Sin perfiles asignados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
