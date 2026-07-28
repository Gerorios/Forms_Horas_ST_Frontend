'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { useCrearUsuario, useRoles, useContratosAdmin, useTiposNovedadAdmin } from '@/lib/api/admin';
import type { EmpleadoBusqueda } from '@/types/domain';

export function UsuarioForm({ onCreado }: { onCreado: () => void }) {
  const crear = useCrearUsuario();
  const { data: roles } = useRoles();
  const { data: contratos } = useContratosAdmin();
  const { data: tiposNovedad } = useTiposNovedadAdmin();
  const [enNomina, setEnNomina] = useState(true);
  const [empleado, setEmpleado] = useState<EmpleadoBusqueda[]>([]);
  const [cuilManual, setCuilManual] = useState('');
  const [nombreManual, setNombreManual] = useState('');
  const [apellidoManual, setApellidoManual] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rolId, setRolId] = useState<number | null>(null);
  const [contratosIds, setContratosIds] = useState<number[]>([]);
  const [contratosJefeIds, setContratosJefeIds] = useState<number[]>([]);
  const [cargaNovedades, setCargaNovedades] = useState(false);
  const [tiposNovedadIds, setTiposNovedadIds] = useState<number[]>([]);

  const puedeNomina = enNomina && empleado.length === 1;
  const puedeManual =
    !enNomina && cuilManual.trim() !== '' && nombreManual.trim() !== '' && apellidoManual.trim() !== '';
  const puede =
    (puedeNomina || puedeManual) && email.trim() !== '' && password.length >= 8 && rolId != null;
  const esJefeContrato = (roles ?? []).find((r) => r.id === rolId)?.nombre === 'JefeContrato';
  const esJefeCuadrilla = (roles ?? []).find((r) => r.id === rolId)?.nombre === 'JefeCuadrilla';

  function cambiarEnNomina(valor: boolean) {
    setEnNomina(valor);
    setEmpleado([]);
    setCuilManual('');
    setNombreManual('');
    setApellidoManual('');
  }

  function toggleContrato(id: number) {
    setContratosIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleContratoJefe(id: number) {
    setContratosJefeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleTipoNovedad(id: number) {
    setTiposNovedadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function cambiarCargaNovedades(checked: boolean) {
    setCargaNovedades(checked);
    if (!checked) setTiposNovedadIds([]);
  }

  async function enviar() {
    if (!puede || rolId == null) return;
    const promesa = crear.mutateAsync({
      cuil: enNomina ? empleado[0].cuil : cuilManual.trim(),
      nombreFueraNomina: enNomina ? undefined : `${apellidoManual.trim().toUpperCase()} ${nombreManual.trim().toUpperCase()}`,
      email: email.trim(),
      password,
      rolId,
      contratosIds: contratosIds.length ? contratosIds : undefined,
      contratosJefeIds: contratosJefeIds.length ? contratosJefeIds : undefined,
      tiposNovedadIds: tiposNovedadIds.length ? tiposNovedadIds : undefined,
    });
    toast.promise(promesa, { loading: 'Creando usuario…', success: 'Usuario creado', error: 'No se pudo crear el usuario' });
    try {
      await promesa;
      cambiarEnNomina(true);
      setEmail(''); setPassword(''); setRolId(null); setContratosIds([]); setContratosJefeIds([]);
      setCargaNovedades(false); setTiposNovedadIds([]);
      onCreado();
    } catch {
      // toast.promise ya avisó
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-semibold text-ink">Nuevo usuario</h2>
      <div className="flex gap-4 text-sm font-medium text-ink">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="en-nomina" checked={enNomina} onChange={() => cambiarEnNomina(true)} />
          En nómina
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="en-nomina" checked={!enNomina} onChange={() => cambiarEnNomina(false)} />
          Fuera de nómina
        </label>
      </div>
      {enNomina ? (
        <div className="space-y-1">
          <span className="text-sm font-medium text-ink">Empleado</span>
          <OperariosSelect value={empleado} onChange={(v) => setEmpleado(v.slice(-1))} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Nombre
            <input aria-label="Nombre" value={nombreManual} onChange={(e) => setNombreManual(e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Apellido
            <input aria-label="Apellido" value={apellidoManual} onChange={(e) => setApellidoManual(e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            CUIL
            <input aria-label="CUIL" value={cuilManual} onChange={(e) => setCuilManual(e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Email
          <input aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Contraseña
          <input aria-label="Contraseña" type="text" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 8 caracteres"
            className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink sm:max-w-xs">
        Rol
        <select aria-label="Rol" value={rolId ?? ''} onChange={(e) => setRolId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30">
          <option value="">—</option>
          {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
      </label>
      <div>
        <p className="text-sm font-medium text-ink">Contratos habilitados (para roles que cargan)</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(contratos ?? []).map((c) => {
            const on = contratosIds.includes(c.id);
            return (
              <button key={c.id} type="button" onClick={() => toggleContrato(c.id)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? 'border-brand bg-accent font-medium text-ink' : 'border-line text-slate hover:border-brand/50'}`}>
                {c.codigo}
              </button>
            );
          })}
        </div>
      </div>
      {esJefeContrato && (
        <div>
          <p className="text-sm font-medium text-ink">Contratos de los que es Jefe (aprueba/desaprueba)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(contratos ?? []).map((c) => {
              const on = contratosJefeIds.includes(c.id);
              return (
                <button key={c.id} type="button" onClick={() => toggleContratoJefe(c.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? 'border-brand bg-accent font-medium text-ink' : 'border-line text-slate hover:border-brand/50'}`}>
                  {c.codigo}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {esJefeCuadrilla && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={cargaNovedades}
              onChange={(e) => cambiarCargaNovedades(e.target.checked)}
            />
            ¿Carga novedades?
          </label>
          {cargaNovedades && (
            <div>
              <p className="text-sm font-medium text-ink">Tipos de novedad habilitados</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(tiposNovedad ?? []).map((t) => {
                  const on = tiposNovedadIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => toggleTipoNovedad(t.id)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? 'border-brand bg-accent font-medium text-ink' : 'border-line text-slate hover:border-brand/50'}`}>
                      {t.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      <button type="button" disabled={!puede || crear.isPending} onClick={enviar}
        className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50">
        {crear.isPending ? 'Creando…' : 'Crear usuario'}
      </button>
    </div>
  );
}
