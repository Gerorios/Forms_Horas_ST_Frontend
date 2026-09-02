'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/session';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import {
  useItemsCert,
  useCrearItemCert,
  useEditarItemCert,
  useEliminarItemCert,
  useContratosAnalytics,
  type ItemCert,
  type CamposItemCert,
} from '@/lib/api/certificaciones';

type PayloadAlta = { item_codigo: string; codigo_k: string; tarea: string } & CamposItemCert;
type PayloadEdicion = { idItem: number; codigo_k?: string; tarea?: string } & CamposItemCert;

const CONTRATO_CHIP = 'inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand ring-1 ring-inset ring-brand/25';
const TIPO_CHIP: Record<string, string> = {
  OPEX: 'inline-flex items-center rounded-full bg-approved/10 px-2 py-0.5 text-xs font-medium text-approved ring-1 ring-inset ring-approved/25',
  CAPEX: 'inline-flex items-center rounded-full bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn ring-1 ring-inset ring-warn/25',
};

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60';

// Paginación client-side sobre la lista ya filtrada por el server — mismo
// patrón que `liquidacion/perfiles/page.tsx` (POR_PAGINA, paginaSegura,
// reset a página 1 al cambiar filtros).
const POR_PAGINA = 50;

function mensajeError(e: unknown, fallback: string): string {
  return String((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback);
}

interface FormState {
  item_codigo: string;
  codigo_k: string;
  tarea: string;
  tipo: '' | 'OPEX' | 'CAPEX';
  unidad_medida: string;
  ptos_gasnor: string;
  contratista: string;
  frecuencia: string;
  grupo: string;
  subgrupo: string;
  contrato_nombre: string;
}

const FORM_VACIO: FormState = {
  item_codigo: '',
  codigo_k: '',
  tarea: '',
  tipo: '',
  unidad_medida: '',
  ptos_gasnor: '',
  contratista: '',
  frecuencia: '',
  grupo: '',
  subgrupo: '',
  contrato_nombre: '',
};

function itemAForm(item: ItemCert): FormState {
  return {
    item_codigo: item.item_codigo,
    codigo_k: item.codigo_k,
    tarea: item.tarea,
    tipo: item.tipo === 'OPEX' || item.tipo === 'CAPEX' ? item.tipo : '',
    unidad_medida: item.unidad_medida ?? '',
    ptos_gasnor: item.ptos_gasnor === null ? '' : String(item.ptos_gasnor),
    contratista: item.contratista ?? '',
    frecuencia: item.frecuencia ?? '',
    grupo: item.grupo ?? '',
    subgrupo: item.subgrupo ?? '',
    contrato_nombre: item.contrato_nombre ?? '',
  };
}

/** `''` → `null` (borra el campo en edición); nunca se omite la clave — el
 * backend distingue "no mandado" (no toca) de `null` (borra) en el PATCH. */
function campoOnull(v: string): string | null {
  const t = v.trim();
  return t === '' ? null : t;
}

/** Modal de alta/edición de un ítem del maestro — mismo patrón de overlay que
 * `EditarNovedadDialog`. En edición: código deshabilitado, `codigo_k` puede
 * cambiar (mueve el ítem de contrato) y dispara la advertencia; cualquier
 * campo de "Ver más campos" que se vacíe se manda `null` explícito. */
function ItemModal({
  contratos,
  item,
  onCancel,
  onGuardar,
  guardando,
}: {
  contratos: string[];
  item: ItemCert | null;
  onCancel: () => void;
  onGuardar: (payload: PayloadAlta | PayloadEdicion) => void;
  guardando: boolean;
}) {
  const esEdicion = item !== null;
  const [form, setForm] = useState<FormState>(item ? itemAForm(item) : FORM_VACIO);
  const [masCampos, setMasCampos] = useState(() =>
    item ? Boolean(item.contratista || item.frecuencia || item.grupo || item.subgrupo || item.contrato_nombre) : false,
  );

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  const contratoCambiado = esEdicion && form.codigo_k !== item!.codigo_k;
  const valido = form.item_codigo.trim() !== '' && form.codigo_k !== '' && form.tarea.trim() !== '';

  function guardar() {
    if (!valido) return;
    const camposComunes = {
      codigo_k: form.codigo_k,
      tipo: form.tipo === '' ? null : form.tipo,
      unidad_medida: campoOnull(form.unidad_medida),
      ptos_gasnor: form.ptos_gasnor.trim() === '' ? null : Number(form.ptos_gasnor),
      contratista: campoOnull(form.contratista),
      frecuencia: campoOnull(form.frecuencia),
      grupo: campoOnull(form.grupo),
      subgrupo: campoOnull(form.subgrupo),
      contrato_nombre: campoOnull(form.contrato_nombre),
    };
    if (esEdicion) {
      onGuardar({ idItem: item!.id_item, ...camposComunes, tarea: form.tarea.trim() });
    } else {
      onGuardar({ item_codigo: form.item_codigo.trim(), tarea: form.tarea.trim(), ...camposComunes });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">{esEdicion ? 'Editar ítem' : 'Nuevo ítem'}</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Código
            <input
              aria-label="Código"
              value={form.item_codigo}
              disabled={esEdicion}
              onChange={(e) => set('item_codigo', e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Contrato
            <select
              aria-label="Contrato"
              value={form.codigo_k}
              onChange={(e) => set('codigo_k', e.target.value)}
              className={inputCls}
            >
              <option value="">Elegir contrato…</option>
              {contratos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {contratoCambiado && (
              <span className="text-xs text-warn">
                Mover el ítem de contrato cambia a qué K se imputan las cargas futuras de este código.
              </span>
            )}
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Tarea
          <input
            aria-label="Tarea"
            value={form.tarea}
            onChange={(e) => set('tarea', e.target.value)}
            className={inputCls}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Tipo
            <select aria-label="Tipo" value={form.tipo} onChange={(e) => set('tipo', e.target.value as FormState['tipo'])} className={inputCls}>
              <option value="">Sin especificar</option>
              <option value="OPEX">OPEX</option>
              <option value="CAPEX">CAPEX</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Unidad de medida
            <input
              aria-label="Unidad de medida"
              value={form.unidad_medida}
              onChange={(e) => set('unidad_medida', e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Ptos. Gasnor
            <input
              aria-label="Ptos. Gasnor"
              type="number"
              step="0.01"
              value={form.ptos_gasnor}
              onChange={(e) => set('ptos_gasnor', e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setMasCampos((v) => !v)}
          className="text-sm font-medium text-brand hover:underline"
        >
          {masCampos ? 'Ocultar campos' : 'Ver más campos'}
        </button>

        {masCampos && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Contratista
              <input
                aria-label="Contratista"
                value={form.contratista}
                onChange={(e) => set('contratista', e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Frecuencia
              <input
                aria-label="Frecuencia"
                value={form.frecuencia}
                onChange={(e) => set('frecuencia', e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Grupo
              <input aria-label="Grupo" value={form.grupo} onChange={(e) => set('grupo', e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Subgrupo
              <input
                aria-label="Subgrupo"
                value={form.subgrupo}
                onChange={(e) => set('subgrupo', e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink sm:col-span-2">
              Nombre de contrato
              <input
                aria-label="Nombre de contrato"
                value={form.contrato_nombre}
                onChange={(e) => set('contrato_nombre', e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!valido || guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmarEliminarModal({
  item,
  onCancel,
  onConfirmar,
  eliminando,
}: {
  item: ItemCert;
  onCancel: () => void;
  onConfirmar: () => void;
  eliminando: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">Eliminar ítem</h3>
        <p className="text-sm text-slate">
          ¿Eliminar el ítem <span className="font-medium text-ink">{item.item_codigo}</span>? Esta acción no se puede
          deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger-solid" disabled={eliminando} onClick={onConfirmar}>
            Eliminar ítem
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Pantalla "Ítems" del módulo Certificaciones — Admin only (gate por
 * `perfil.cert.nivel`, mismo mecanismo de `return null` que el resto de
 * layouts gateados de la app, ver `admin/layout.tsx`/`novedades/layout.tsx`).
 * El nav del módulo (`certificaciones-nav.ts`) ya oculta la entrada para
 * niveles `carga`/`lectura`; este gate es la segunda barrera si alguien
 * navega directo a la URL. */
export default function ItemsCertPage() {
  const { perfil } = useSession();
  const esAdmin = perfil?.cert?.nivel === 'admin';

  const [contratoFiltro, setContratoFiltro] = useState('');
  const [buscar, setBuscar] = useState('');
  const [buscarDebounced, setBuscarDebounced] = useState('');

  // Debounce de 300ms: evita disparar un request por cada tecla tipeada.
  useEffect(() => {
    const t = setTimeout(() => setBuscarDebounced(buscar), 300);
    return () => clearTimeout(t);
  }, [buscar]);

  const { data: contratos } = useContratosAnalytics();
  const { data: items, isLoading } = useItemsCert(
    { codigoK: contratoFiltro || undefined, buscar: buscarDebounced || undefined },
    esAdmin,
  );
  const crear = useCrearItemCert();
  const editar = useEditarItemCert();
  const eliminar = useEliminarItemCert();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemEditando, setItemEditando] = useState<ItemCert | null>(null);
  const [itemAEliminar, setItemAEliminar] = useState<ItemCert | null>(null);

  const [pagina, setPagina] = useState(1);
  const filas = items ?? [];
  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const enPagina = filas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  // Reset a página 1 al cambiar el filtro de contrato o el buscador (ya
  // debounced) — evita quedar "varado" en una página vacía tras filtrar.
  useEffect(() => {
    setPagina(1);
  }, [contratoFiltro, buscarDebounced]);

  if (!esAdmin) return null;

  function abrirAlta() {
    setItemEditando(null);
    setModalAbierto(true);
  }

  function abrirEdicion(item: ItemCert) {
    setItemEditando(item);
    setModalAbierto(true);
  }

  function guardar(payload: PayloadAlta | PayloadEdicion) {
    const promesa = itemEditando
      ? editar.mutateAsync(payload as PayloadEdicion)
      : crear.mutateAsync(payload as PayloadAlta);
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Ítem guardado',
      error: (e: unknown) => mensajeError(e, 'No se pudo guardar el ítem'),
    });
    promesa.then(() => setModalAbierto(false)).catch(() => {});
  }

  function confirmarEliminar() {
    if (!itemAEliminar) return;
    const promesa = eliminar.mutateAsync(itemAEliminar.id_item);
    toast.promise(promesa, {
      loading: 'Eliminando…',
      success: 'Ítem eliminado',
      error: (e: unknown) => mensajeError(e, 'No se pudo eliminar'),
    });
    promesa.then(() => setItemAEliminar(null)).catch(() => {});
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Certificaciones"
        title="Ítems"
        action={
          <Button variant="primary" onClick={abrirAlta}>
            Nuevo ítem
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <select
          aria-label="Filtrar por contrato"
          value={contratoFiltro}
          onChange={(e) => setContratoFiltro(e.target.value)}
          className={inputCls}
        >
          <option value="">Todos los contratos</option>
          {(contratos ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          aria-label="Buscar"
          placeholder="Buscar código o tarea…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          className={`${inputCls} min-w-56 flex-1`}
        />
        <span className="text-sm text-slate">{filas.length} ítems</span>
      </div>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm" aria-label="Ítems del maestro">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-3 py-2.5 font-medium">Código</th>
                <th className="px-3 py-2.5 font-medium">Contrato</th>
                <th className="px-3 py-2.5 font-medium">Tarea</th>
                <th className="px-3 py-2.5 font-medium">Tipo</th>
                <th className="px-3 py-2.5 font-medium">UM</th>
                <th className="px-3 py-2.5 text-right font-medium">Ptos. Gasnor</th>
                <th className="px-3 py-2.5 font-medium">Contratista</th>
                <th className="px-3 py-2.5 font-medium">Frecuencia</th>
                <th className="px-3 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {enPagina.map((it) => (
                <tr key={it.id_item} className="border-b border-line text-ink last:border-0">
                  <td className="px-3 py-2.5 font-medium">{it.item_codigo}</td>
                  <td className="px-3 py-2.5">
                    <span className={CONTRATO_CHIP}>{it.codigo_k}</span>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2.5" title={it.tarea}>
                    {it.tarea}
                  </td>
                  <td className="px-3 py-2.5">
                    {it.tipo ? <span className={TIPO_CHIP[it.tipo] ?? CONTRATO_CHIP}>{it.tipo}</span> : <span className="text-slate">—</span>}
                  </td>
                  <td className="px-3 py-2.5">{it.unidad_medida ?? '—'}</td>
                  <td className="tabular-nums px-3 py-2.5 text-right">{it.ptos_gasnor === null ? '—' : it.ptos_gasnor}</td>
                  <td className="px-3 py-2.5">{it.contratista ?? '—'}</td>
                  <td className="px-3 py-2.5">{it.frecuencia ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="xs" onClick={() => abrirEdicion(it)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setItemAEliminar(it)}>
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {enPagina.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-3 text-sm text-slate">
                    Sin ítems para los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && (
        <div className="flex items-center justify-between text-sm text-slate">
          <span>
            Página {paginaSegura} de {totalPaginas} — {filas.length} ítem{filas.length === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={paginaSegura <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {modalAbierto && (
        <ItemModal
          contratos={contratos ?? []}
          item={itemEditando}
          onCancel={() => setModalAbierto(false)}
          onGuardar={guardar}
          guardando={crear.isPending || editar.isPending}
        />
      )}

      {itemAEliminar && (
        <ConfirmarEliminarModal
          item={itemAEliminar}
          onCancel={() => setItemAEliminar(null)}
          onConfirmar={confirmarEliminar}
          eliminando={eliminar.isPending}
        />
      )}
    </section>
  );
}
