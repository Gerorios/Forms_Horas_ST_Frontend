'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useEditarUsuario, useRoles, useContratosAdmin, useTiposNovedadAdmin, type UsuarioAdmin } from '@/lib/api/admin';

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

export function UsuarioEditRow({
  usuario,
  estado,
  onResetearPassword,
}: {
  usuario: UsuarioAdmin;
  estado: ReactNode;
  onResetearPassword: () => void;
}) {
  const editar = useEditarUsuario();
  const { data: roles } = useRoles();
  const { data: contratos } = useContratosAdmin();
  const { data: tiposNovedad } = useTiposNovedadAdmin();

  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState(usuario.email);
  const [rolId, setRolId] = useState<number>(usuario.rolId);
  const [contratosIds, setContratosIds] = useState<number[]>(
    usuario.contratosHabilitados.map((c) => c.contratoId),
  );
  const [contratosJefeIds, setContratosJefeIds] = useState<number[]>(
    usuario.contratosComoJefe.map((c) => c.id),
  );
  const [tiposNovedadIds, setTiposNovedadIds] = useState<number[]>(
    usuario.tiposNovedadHabilitados.map((t) => t.tipoNovedadId),
  );
  const [cargaNovedades, setCargaNovedades] = useState(usuario.tiposNovedadHabilitados.length > 0);
  const [puedeCargarKm, setPuedeCargarKm] = useState(usuario.puedeCargarKmPorTantos);
  const [password, setPassword] = useState('');

  const origContratos = usuario.contratosHabilitados.map((c) => c.contratoId);
  const origContratosJefe = usuario.contratosComoJefe.map((c) => c.id);
  const origTiposNovedad = usuario.tiposNovedadHabilitados.map((t) => t.tipoNovedadId);

  const emailValido = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordValido = password === '' || password.length >= 8;

  const contratosCambio =
    contratosIds.length !== origContratos.length ||
    contratosIds.some((id) => !origContratos.includes(id));
  const contratosJefeCambio =
    contratosJefeIds.length !== origContratosJefe.length ||
    contratosJefeIds.some((id) => !origContratosJefe.includes(id));
  const tiposNovedadCambio =
    tiposNovedadIds.length !== origTiposNovedad.length ||
    tiposNovedadIds.some((id) => !origTiposNovedad.includes(id));
  const puedeCargarKmCambio = puedeCargarKm !== usuario.puedeCargarKmPorTantos;
  const huboCambios =
    email.trim() !== usuario.email ||
    rolId !== usuario.rolId ||
    contratosCambio ||
    contratosJefeCambio ||
    tiposNovedadCambio ||
    puedeCargarKmCambio ||
    password !== '';

  const puedeGuardar = emailValido && passwordValido && huboCambios && !editar.isPending;
  const esJefeContrato = (roles ?? []).find((r) => r.id === rolId)?.nombre === 'JefeContrato';
  const esJefeCuadrilla = (roles ?? []).find((r) => r.id === rolId)?.nombre === 'JefeCuadrilla';

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

  function cerrar() {
    setAbierto(false);
    setEmail(usuario.email);
    setRolId(usuario.rolId);
    setContratosIds(origContratos);
    setContratosJefeIds(origContratosJefe);
    setTiposNovedadIds(origTiposNovedad);
    setCargaNovedades(origTiposNovedad.length > 0);
    setPuedeCargarKm(usuario.puedeCargarKmPorTantos);
    setPassword('');
  }

  async function guardar() {
    if (!puedeGuardar) return;
    const payload: {
      cuil: string; email?: string; rolId?: number; contratosIds?: number[];
      contratosJefeIds?: number[]; tiposNovedadIds?: number[]; puedeCargarKmPorTantos?: boolean; password?: string;
    } = { cuil: usuario.cuil };
    if (email.trim() !== usuario.email) payload.email = email.trim();
    if (rolId !== usuario.rolId) payload.rolId = rolId;
    if (contratosCambio) payload.contratosIds = contratosIds;
    if (contratosJefeCambio) payload.contratosJefeIds = contratosJefeIds;
    if (tiposNovedadCambio) payload.tiposNovedadIds = tiposNovedadIds;
    if (puedeCargarKmCambio) payload.puedeCargarKmPorTantos = puedeCargarKm;
    if (password !== '') payload.password = password;

    const promesa = editar.mutateAsync(payload);
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Usuario actualizado',
      error: 'No se pudo actualizar',
    });
    try {
      await promesa;
      setAbierto(false);
      setPassword('');
    } catch {
      // toast.promise ya avisó
    }
  }

  return (
    <>
      <tr className="border-b border-line last:border-0">
        <td className="px-4 py-2.5 text-ink">{usuario.empleado.apellido_nombre}</td>
        <td className="px-4 py-2.5 text-slate">{usuario.email}</td>
        <td className="px-4 py-2.5 text-ink">{usuario.rol.nombre}</td>
        <td className="px-4 py-2.5 text-slate">
          {usuario.contratosHabilitados.map((c) => c.contrato.codigo).join(', ') || '—'}
        </td>
        <td className="px-4 py-2.5">{estado}</td>
        <td className="px-4 py-2.5">
          <button
            type="button"
            onClick={() => (abierto ? cerrar() : setAbierto(true))}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60"
          >
            {abierto ? 'Cerrar' : 'Editar ▾'}
          </button>
        </td>
      </tr>
      {abierto && (
        <tr className="border-b border-line bg-accent/20">
          <td colSpan={6} className="px-4 py-4">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                  Email
                  <input aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                  Nueva contraseña
                  <input
                    aria-label="Nueva contraseña"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="vacío = no cambia (mín. 8)"
                    className={inputCls}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium text-ink sm:max-w-xs">
                Rol
                <select
                  aria-label="Rol"
                  value={rolId}
                  onChange={(e) => setRolId(Number(e.target.value))}
                  className={inputCls}
                >
                  {(roles ?? []).map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-sm font-medium text-ink">Contratos habilitados</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(contratos ?? []).map((c) => {
                    const on = contratosIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleContrato(c.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${
                          on ? 'border-brand bg-accent font-medium text-ink' : 'border-line text-slate hover:border-brand/50'
                        }`}
                      >
                        {c.codigo}
                      </button>
                    );
                  })}
                </div>
              </div>
              {esJefeContrato && (
                <div>
                  <p className="text-sm font-medium text-ink">
                    Contratos de los que es Jefe (aprueba/desaprueba)
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(contratos ?? []).map((c) => {
                      const on = contratosJefeIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleContratoJefe(c.id)}
                          className={`rounded-full border px-2.5 py-1 text-xs transition ${
                            on ? 'border-brand bg-accent font-medium text-ink' : 'border-line text-slate hover:border-brand/50'
                          }`}
                        >
                          {c.codigo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {esJefeContrato && (
                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={puedeCargarKm}
                    onChange={(e) => setPuedeCargarKm(e.target.checked)}
                  />
                  ¿Puede cargar Km por tantos?
                </label>
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
                            <button
                              key={t.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleTipoNovedad(t.id)}
                              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                                on ? 'border-brand bg-accent font-medium text-ink' : 'border-line text-slate hover:border-brand/50'
                              }`}
                            >
                              {t.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!puedeGuardar}
                  onClick={guardar}
                  className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
                >
                  {editar.isPending ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={cerrar}
                  className="rounded-md border border-line px-4 py-2 text-sm font-medium text-slate transition hover:bg-accent/60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onResetearPassword}
                  className="ml-auto rounded-md border border-line px-4 py-2 text-sm font-medium text-slate transition hover:bg-accent/60"
                >
                  Resetear contraseña
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
