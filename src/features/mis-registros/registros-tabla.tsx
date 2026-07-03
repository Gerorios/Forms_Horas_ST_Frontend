'use client';

import { useMemo } from 'react';
import { enQuincena, type Quincena } from '@/lib/quincena';
import type { RegistroHoras } from '@/types/domain';

const CHIP: Record<string, string> = {
  pendiente: 'bg-neutral/15 text-neutral',
  aprobado: 'bg-green-100 text-green-800',
  desaprobado: 'bg-alert/15 text-alert',
};

export function RegistrosTabla({
  registros,
  quincena,
  isLoading,
  mostrarOperario = false,
}: {
  registros: RegistroHoras[] | undefined;
  quincena: Quincena;
  isLoading: boolean;
  mostrarOperario?: boolean;
}) {
  const filtrados = useMemo(
    () => (registros ?? []).filter((r) => enQuincena(r.fecha, quincena)),
    [registros, quincena],
  );
  const total = useMemo(
    () => filtrados.reduce((s, r) => s + Number(r.horas), 0),
    [filtrados],
  );

  if (isLoading) return <p className="text-neutral">Cargando…</p>;
  if (filtrados.length === 0)
    return <p className="text-neutral/60">Sin registros en esta quincena.</p>;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral/20 text-left text-neutral/70">
              <th className="py-2">Fecha</th>
              {mostrarOperario && <th>Operario</th>}
              <th>Contrato</th>
              <th>Tarea</th>
              <th>Horas</th>
              <th>Estado</th>
              <th>Móviles</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => (
              <tr key={r.id} className="border-b border-neutral/10">
                <td className="py-2">{r.fecha.slice(0, 10)}</td>
                {mostrarOperario && <td>{r.operario.apellido_nombre}</td>}
                <td>{r.contrato.codigo}</td>
                <td>{r.tarea.nombre}</td>
                <td>
                  {r.horas}
                  {r.alertaHoras && (
                    <span className="ml-1 rounded bg-alert/15 px-1 text-xs text-alert">+16h</span>
                  )}
                </td>
                <td>
                  <span className={`rounded px-2 py-0.5 text-xs ${CHIP[r.estado] ?? ''}`}>
                    {r.estado}
                  </span>
                  {r.estado === 'desaprobado' && r.motivoDesaprobacion && (
                    <span className="ml-1 text-xs text-alert" title={r.motivoDesaprobacion}>
                      (motivo)
                    </span>
                  )}
                </td>
                <td>{r.moviles.map((m) => m.movil.identificador).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-neutral">
        Total de la quincena: <strong>{total}</strong> hs
      </p>
    </>
  );
}
