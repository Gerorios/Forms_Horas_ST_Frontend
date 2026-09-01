'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import { useContratosAdmin, useUsuariosAdmin } from '@/lib/api/admin';
import {
  useAccesosCert,
  useEliminarAccesoCert,
  useGuardarAccesoCert,
  type AccesoCert,
  type NivelAccesoCert,
} from '@/lib/api/certificaciones';

const NIVELES: { value: NivelAccesoCert; label: string }[] = [
  { value: 'carga', label: 'Carga' },
  { value: 'lectura', label: 'Lectura' },
  { value: 'admin', label: 'Admin' },
];
const NIVEL_LABEL = Object.fromEntries(NIVELES.map((n) => [n.value, n.label]));

const NIVEL_CHIP: Record<NivelAccesoCert, string> = {
  admin: 'bg-brand/10 text-brand ring-brand/25',
  carga: 'bg-approved/10 text-approved ring-approved/25',
  lectura: 'bg-slate/10 text-slate ring-slate/25',
};

function ChipsContratos({
  contratos,
  seleccion,
  onToggle,
}: {
  contratos: { id: number; codigo: string }[];
  seleccion: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {contratos.map((c) => {
        const activo = seleccion.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset transition ${
              activo ? 'bg-brand/10 text-brand ring-brand/40 font-medium' : 'bg-surface text-slate ring-line hover:text-ink'
            }`}
          >
            {c.codigo}
          </button>
        );
      })}
    </div>
  );
}

/** Form compartido entre el alta y la edición inline de una fila. */
function CamposAcceso({
  nivel,
  setNivel,
  contratoIds,
  toggleContrato,
  verIncidencia,
  setVerIncidencia,
  contratos,
}: {
  nivel: NivelAccesoCert;
  setNivel: (n: NivelAccesoCert) => void;
  contratoIds: number[];
  toggleContrato: (id: number) => void;
  verIncidencia: boolean;
  setVerIncidencia: (v: boolean) => void;
  contratos: { id: number; codigo: string }[];
}) {
  return (
    <>
      <select
        aria-label="Nivel"
        value={nivel}
        onChange={(e) => setNivel(e.target.value as NivelAccesoCert)}
        className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      >
        {NIVELES.map((n) => (
          <option key={n.value} value={n.value}>
            {n.label}
          </option>
        ))}
      </select>
      {nivel === 'carga' && (
        <ChipsContratos contratos={contratos} seleccion={contratoIds} onToggle={toggleContrato} />
      )}
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label="Ve incidencia de MO"
          checked={verIncidencia}
          onChange={(e) => setVerIncidencia(e.target.checked)}
          className="h-4 w-4 rounded border-line accent-brand"
        />
        Ve incidencia de MO
      </label>
    </>
  );
}

function FilaAcceso({
  acceso,
  contratos,
  onGuardar,
  onQuitar,
  pending,
}: {
  acceso: AccesoCert;
  contratos: { id: number; codigo: string }[];
  onGuardar: (dto: { cuil: string; nivel: NivelAccesoCert; verIncidencia: boolean; contratoIds: number[] }) => void;
  onQuitar: (cuil: string) => void;
  pending: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [nivel, setNivel] = useState<NivelAccesoCert>(acceso.nivel);
  const [contratoIds, setContratoIds] = useState<number[]>(acceso.contratos.map((c) => c.id));
  const [verIncidencia, setVerIncidencia] = useState(acceso.verIncidencia);

  function empezarEdicion() {
    setNivel(acceso.nivel);
    setContratoIds(acceso.contratos.map((c) => c.id));
    setVerIncidencia(acceso.verIncidencia);
    setEditando(true);
  }

  function toggleContrato(id: number) {
    setContratoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function guardar() {
    onGuardar({ cuil: acceso.cuil, nivel, verIncidencia, contratoIds: nivel === 'carga' ? contratoIds : [] });
    setEditando(false);
  }

  if (editando) {
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <span className="min-w-40 font-medium text-ink">{acceso.nombre}</span>
        <CamposAcceso
          nivel={nivel}
          setNivel={setNivel}
          contratoIds={contratoIds}
          toggleContrato={toggleContrato}
          verIncidencia={verIncidencia}
          setVerIncidencia={setVerIncidencia}
          contratos={contratos}
        />
        <div className="ml-auto flex gap-2">
          <Button variant="primary" disabled={pending} onClick={guardar}>
            Guardar
          </Button>
          <Button variant="ghost" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2.5">
      <div className="min-w-40">
        <p className="font-medium text-ink">{acceso.nombre}</p>
        <p className="text-xs text-slate">{acceso.cuil}</p>
      </div>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${NIVEL_CHIP[acceso.nivel]}`}
      >
        {NIVEL_LABEL[acceso.nivel]}
      </span>
      {acceso.nivel === 'carga' && (
        <div className="flex flex-wrap gap-1">
          {acceso.contratos.map((c) => (
            <span key={c.id} className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand ring-1 ring-inset ring-brand/25">
              {c.codigo}
            </span>
          ))}
          {acceso.contratos.length === 0 && <span className="text-xs text-slate">sin contratos</span>}
        </div>
      )}
      <span className="text-xs text-slate">{acceso.verIncidencia ? 'Con incidencia de MO' : 'Sin incidencia'}</span>
      <div className="ml-auto flex gap-2">
        <Button variant="ghost" onClick={empezarEdicion}>
          Editar
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => onQuitar(acceso.cuil)}>
          Quitar
        </Button>
      </div>
    </li>
  );
}

export default function AccesosCertificacionesPage() {
  const { data: accesos, isLoading } = useAccesosCert();
  const { data: usuarios } = useUsuariosAdmin();
  const { data: contratos } = useContratosAdmin();
  const guardar = useGuardarAccesoCert();
  const eliminar = useEliminarAccesoCert();

  const [cuil, setCuil] = useState('');
  const [nivel, setNivel] = useState<NivelAccesoCert>('carga');
  const [contratoIds, setContratoIds] = useState<number[]>([]);
  const [verIncidencia, setVerIncidencia] = useState(false);

  const conAcceso = new Set((accesos ?? []).map((a) => a.cuil));
  const candidatos = (usuarios ?? []).filter((u) => u.activo && !conAcceso.has(u.cuil));
  const contratosActivos = (contratos ?? [])
    .filter((c) => c.activo)
    .map((c) => ({ id: c.id, codigo: c.codigo }));

  function toggleContrato(id: number) {
    setContratoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function guardarAcceso(dto: { cuil: string; nivel: NivelAccesoCert; verIncidencia: boolean; contratoIds: number[] }) {
    toast.promise(guardar.mutateAsync(dto), {
      loading: 'Guardando…',
      success: 'Acceso guardado',
      error: 'No se pudo guardar',
    });
  }

  function darAcceso() {
    if (!cuil) return;
    guardarAcceso({ cuil, nivel, verIncidencia, contratoIds: nivel === 'carga' ? contratoIds : [] });
    setCuil('');
    setNivel('carga');
    setContratoIds([]);
    setVerIncidencia(false);
  }

  function quitar(cuilQuitar: string) {
    toast.promise(eliminar.mutateAsync(cuilQuitar), {
      loading: 'Quitando…',
      success: 'Acceso quitado',
      error: 'No se pudo quitar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Admin" title="Accesos a Certificaciones" />
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <select
          aria-label="Usuario"
          value={cuil}
          onChange={(e) => setCuil(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Elegir usuario…</option>
          {candidatos.map((u) => (
            <option key={u.cuil} value={u.cuil}>
              {u.empleado?.apellido_nombre ?? u.email}
            </option>
          ))}
        </select>
        <CamposAcceso
          nivel={nivel}
          setNivel={setNivel}
          contratoIds={contratoIds}
          toggleContrato={toggleContrato}
          verIncidencia={verIncidencia}
          setVerIncidencia={setVerIncidencia}
          contratos={contratosActivos}
        />
        <Button variant="primary" disabled={guardar.isPending || !cuil} onClick={darAcceso}>
          Dar acceso
        </Button>
      </div>
      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {(accesos ?? []).map((a) => (
            <FilaAcceso
              key={a.cuil}
              acceso={a}
              contratos={contratosActivos}
              onGuardar={guardarAcceso}
              onQuitar={quitar}
              pending={guardar.isPending || eliminar.isPending}
            />
          ))}
          {(accesos ?? []).length === 0 && (
            <li className="px-4 py-2.5 text-sm text-slate">Nadie tiene acceso todavía.</li>
          )}
        </ul>
      )}
    </section>
  );
}
