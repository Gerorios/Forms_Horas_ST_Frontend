'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { useCrearUsuariosMasivo, type AltaMasivaResp } from '@/lib/api/admin';
import { Button } from '@/components/button';
import type { EmpleadoBusqueda } from '@/types/domain';

export function AltaMasiva({ onListo }: { onListo: () => void }) {
  const crear = useCrearUsuariosMasivo();
  const [empleados, setEmpleados] = useState<EmpleadoBusqueda[]>([]);
  const [resultado, setResultado] = useState<AltaMasivaResp | null>(null);

  async function generar() {
    if (empleados.length === 0) return;
    const promesa = crear.mutateAsync(empleados.map((e) => e.cuil));
    toast.promise(promesa, {
      loading: 'Generando usuarios…',
      success: 'Usuarios generados',
      error: 'No se pudo generar',
    });
    try {
      const resp = await promesa;
      setResultado(resp);
      setEmpleados([]);
      onListo();
    } catch {
      // toast.promise ya avisó
    }
  }

  function copiar() {
    if (!resultado) return;
    const texto = resultado.creados
      .map((c) => `${c.apellido_nombre}\t${c.email}\t${c.password}`)
      .join('\n');
    void navigator.clipboard?.writeText(texto);
    toast.success('Credenciales copiadas');
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-semibold text-ink">Alta masiva de operarios</h2>
      <p className="text-xs text-slate">
        Elegí empleados y generá sus logins de solo consulta (rol Operario). Se crea email por legajo y contraseña aleatoria.
      </p>
      <OperariosSelect value={empleados} onChange={setEmpleados} />
      <Button variant="primary" disabled={empleados.length === 0 || crear.isPending} onClick={generar}>
        {crear.isPending ? 'Generando…' : `Generar usuarios (${empleados.length})`}
      </Button>

      {resultado && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-ink">Credenciales generadas ({resultado.creados.length})</h3>
            {resultado.creados.length > 0 && (
              <Button variant="secondary" size="xs" onClick={copiar}>
                Copiar
              </Button>
            )}
          </div>
          {resultado.creados.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                    <th className="px-3 py-2 font-medium">Empleado</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Contraseña</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.creados.map((c) => (
                    <tr key={c.cuil} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-ink">{c.apellido_nombre}</td>
                      <td className="px-3 py-2 font-mono text-slate">{c.email}</td>
                      <td className="px-3 py-2 font-mono text-ink">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {resultado.omitidos.length > 0 && (
            <p className="text-xs text-slate">
              Omitidos: {resultado.omitidos.map((o) => `${o.cuil} (${o.motivo})`).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
