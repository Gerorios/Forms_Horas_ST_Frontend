'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/session';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import {
  usePreviewCarga,
  useConfirmarCarga,
  useProvinciasAnalytics,
  useContratosAnalytics,
  type FilaPreview,
  type RespuestaPreviewCarga,
  type RespuestaConfirmarCarga,
  type EdicionFilaCarga,
} from '@/lib/api/certificaciones';
import { revalidarFila, hojaCoincideConKs, validarArchivoCarga } from '@/features/certificaciones/carga/revalidar';

// Wizard de carga de certificaciones (Etapa 4 ERP) — paridad UX con
// pages/upload.html del portal (ver docs/superpowers/specs/2026-09-02-
// inventario-carga-portal.md §6), en estilo de la casa. Gate por nivel:
// admin y carga; lectura no ve esta pantalla (ni la entrada del nav, ver
// `certificaciones-nav.ts` + `layout.tsx`) — acá se re-gatea por si alguien
// navega directo a la URL, mismo criterio que `items/page.tsx`.

const POR_PAGINA = 50;

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60';

const BADGE_OK =
  'inline-flex items-center rounded-full bg-approved/10 px-2 py-0.5 text-xs font-medium text-approved ring-1 ring-inset ring-approved/25';
const BADGE_WARN =
  'inline-flex items-center rounded-full bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn ring-1 ring-inset ring-warn/25';
const BADGE_EXCLUIDA =
  'inline-flex items-center rounded-full bg-slate/10 px-2 py-0.5 text-xs font-medium text-slate ring-1 ring-inset ring-slate/25';

function mensajeError(e: unknown, fallback: string): string {
  return String((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback);
}

function fmtMoney(v: string | number | null): string {
  if (v === null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Fila efectiva luego de aplicar la edición local acumulada (o la fila tal
 * cual vino del preview si no fue tocada). Igual criterio que el backend:
 * editar `contrato` cambia `contrato_fuente` a `'editado'`. */
function aplicarEdicion(f: FilaPreview, e: EdicionFilaCarga | undefined) {
  const contrato = e?.contrato ?? f.contrato;
  const contrato_fuente = e?.contrato !== undefined ? 'editado' : f.contrato_fuente;
  return {
    ...f,
    contrato,
    contrato_fuente,
    provincia: e?.provincia ?? f.provincia,
    cantidades: e?.cantidades ?? f.cantidades,
    total_mes: e?.total_mes ?? f.total_mes,
    excluida: e?.excluida ?? f.excluida,
  };
}

export default function CargaCertificacionesPage() {
  const router = useRouter();
  const { perfil } = useSession();
  const nivel = perfil?.cert?.nivel ?? null;
  const puedeCargar = nivel === 'admin' || nivel === 'carga';

  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1;
  const anios = useMemo(() => {
    const out: number[] = [];
    for (let a = anioActual; a >= 2022; a--) out.push(a);
    return out;
  }, [anioActual]);

  const previewMut = usePreviewCarga();
  const confirmarMut = useConfirmarCarga();
  const { data: provinciasDisponibles } = useProvinciasAnalytics();
  const { data: contratosDisponibles } = useContratosAnalytics();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [anio, setAnio] = useState(anioActual);
  const [mes, setMes] = useState(mesActual);
  const [preview, setPreview] = useState<RespuestaPreviewCarga | null>(null);
  const [hojasSel, setHojasSel] = useState<Set<string>>(new Set());
  const [ediciones, setEdiciones] = useState<Map<string, EdicionFilaCarga>>(new Map());
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<RespuestaConfirmarCarga | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!puedeCargar) return null;

  function elegirArchivo(f: File) {
    const err = validarArchivoCarga(f.name, f.size);
    setErrorArchivo(err);
    setArchivo(err ? null : f);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) elegirArchivo(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) elegirArchivo(f);
  }

  async function subirYPrevisualizar() {
    if (!archivo) return;
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('periodo_anio', String(anio));
    form.append('periodo_mes', String(mes));
    try {
      const data = await previewMut.mutateAsync(form);
      setPreview(data);
      const ks = perfil?.cert?.ks ?? [];
      const admin = nivel === 'admin';
      setHojasSel(admin ? new Set(data.hojas) : new Set(data.hojas.filter((h) => hojaCoincideConKs(h, ks))));
      setEdiciones(new Map());
      setPagina(1);
      setStep(2);
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo procesar el archivo'));
    }
  }

  function toggleHoja(h: string) {
    setHojasSel((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  function setEdicionCampo(rowId: string, campo: 'provincia' | 'cantidades' | 'total_mes', valor: string) {
    setEdiciones((prev) => {
      const next = new Map(prev);
      const actual = next.get(rowId) ?? { rowId };
      next.set(rowId, { ...actual, [campo]: valor });
      return next;
    });
  }

  function setExcluida(rowId: string, excluida: boolean) {
    setEdiciones((prev) => {
      const next = new Map(prev);
      const actual = next.get(rowId) ?? { rowId };
      next.set(rowId, { ...actual, excluida });
      return next;
    });
  }

  /** Edición de contrato EN CASCADA: se propaga a todas las filas del mismo
   * item_codigo (puede repetirse en varias hojas/filas del mismo archivo). */
  function setContratoCascada(itemCodigo: string, nuevoContrato: string) {
    if (!preview) return;
    const filasDelItem = preview.filas.filter((f) => f.item_codigo === itemCodigo);
    setEdiciones((prev) => {
      const next = new Map(prev);
      for (const f of filasDelItem) {
        const actual = next.get(f.rowId) ?? { rowId: f.rowId };
        next.set(f.rowId, { ...actual, contrato: nuevoContrato });
      }
      return next;
    });
  }

  const filasEnHojas = preview ? preview.filas.filter((f) => hojasSel.has(f.hoja_origen)) : [];
  const provinciasValidas = provinciasDisponibles ?? [];

  const filasCalculadas = filasEnHojas.map((f) => {
    const vista = aplicarEdicion(f, ediciones.get(f.rowId));
    const { tieneError, detalle } = revalidarFila(vista, { itemExiste: f.item_en_maestro, provinciasValidas });
    return { original: f, vista, tieneError, detalle };
  });

  const aCargar = filasCalculadas.filter((r) => !r.vista.excluida && !r.tieneError).length;
  const conProblema = filasCalculadas.filter((r) => !r.vista.excluida && r.tieneError).length;
  const excluidasCount = filasCalculadas.filter((r) => r.vista.excluida).length;
  const totalFilas = filasCalculadas.length;

  const montoACargar = filasCalculadas
    .filter((r) => !r.vista.excluida && !r.tieneError)
    .reduce((acc, r) => acc + (Number(r.vista.total_mes) || 0), 0);
  const totalDeclarado = preview?.resumen.total_declarado ?? null;
  const descuadre = totalDeclarado !== null && Math.abs(montoACargar - totalDeclarado) > 0.01;

  const totalPaginas = Math.max(1, Math.ceil(filasCalculadas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const enPagina = filasCalculadas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  async function confirmar() {
    if (!preview) return;
    try {
      const data = await confirmarMut.mutateAsync({
        previewId: preview.previewId,
        ediciones: Array.from(ediciones.values()),
      });
      setResultado(data);
      setStep(4);
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo confirmar la carga'));
    }
  }

  function cargarOtra() {
    setArchivo(null);
    setErrorArchivo(null);
    setPreview(null);
    setHojasSel(new Set());
    setEdiciones(new Map());
    setResultado(null);
    setPagina(1);
    setStep(1);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Certificaciones" title="Cargar" />

      {step === 1 && (
        <div className="max-w-xl space-y-4 rounded-xl border border-line bg-surface p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-line p-8 text-center text-sm text-slate hover:border-brand"
          >
            <input
              ref={inputRef}
              type="file"
              aria-label="Archivo"
              className="sr-only"
              onChange={handleInputChange}
            />
            {archivo ? (
              <p className="text-ink">{archivo.name}</p>
            ) : (
              <p>Arrastrá el archivo de certificación acá, o hacé clic para elegirlo.</p>
            )}
            <p className="mt-1 text-xs text-slate">.xlsx, .xlsm o .pdf — máximo 20 MB.</p>
          </div>
          {errorArchivo && <p className="text-sm text-danger">{errorArchivo}</p>}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Mes
              <select aria-label="Mes" value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inputCls}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Año
              <select aria-label="Año" value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={inputCls}>
                {anios.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" disabled={!archivo || previewMut.isPending} onClick={subirYPrevisualizar}>
              {previewMut.isPending ? 'Procesando…' : 'Continuar'}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && preview && (
        <div className="max-w-2xl space-y-4 rounded-xl border border-line bg-surface p-6">
          <p className="text-sm text-slate">
            Elegí las hojas que querés cargar de <span className="font-medium text-ink">{preview.archivo}</span>.
          </p>
          <div className="flex flex-wrap gap-2">
            {preview.hojas.map((h) => {
              const activo = hojasSel.has(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleHoja(h)}
                  className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset transition ${
                    activo ? 'bg-brand/10 text-brand ring-brand/25' : 'bg-surface text-slate ring-line hover:text-ink'
                  }`}
                >
                  {h}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button variant="primary" disabled={hojasSel.size === 0} onClick={() => setStep(3)}>
              Ver filas
            </Button>
          </div>
        </div>
      )}

      {step === 3 && preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4 text-sm">
            <span className="text-ink" data-testid="metrica-a-cargar">
              {`A cargar: ${aCargar}`}
            </span>
            <span className="text-ink" data-testid="metrica-con-problema">
              {`Con problema: ${conProblema}`}
            </span>
            <span className="text-ink" data-testid="metrica-excluidas">
              {`Excluidas: ${excluidasCount}`}
            </span>
            <span className="text-ink" data-testid="metrica-total">
              {`Total: ${totalFilas}`}
            </span>
          </div>

          {descuadre && (
            <p className="rounded-md border border-warn/60 bg-warn/10 px-3 py-2 text-xs text-warn">
              El total a cargar (${fmtMoney(montoACargar)}) no coincide con el total declarado del archivo (${fmtMoney(totalDeclarado)}).
              Podés seguir igual: es solo un aviso.
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm" aria-label="Filas de la carga">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-3 py-2.5 font-medium">Cargar</th>
                  <th className="px-3 py-2.5 font-medium">Hoja</th>
                  <th className="px-3 py-2.5 font-medium">Ítem</th>
                  <th className="px-3 py-2.5 font-medium">Tarea</th>
                  <th className="px-3 py-2.5 font-medium">Contrato</th>
                  <th className="px-3 py-2.5 font-medium">Provincia</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cant.</th>
                  <th className="px-3 py-2.5 text-right font-medium">$Unit</th>
                  <th className="px-3 py-2.5 text-right font-medium">$Total</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {enPagina.map(({ original, vista, tieneError, detalle }) => {
                  const reasignado = vista.contrato_fuente === 'maestro' && original.contrato_archivo !== vista.contrato;
                  return (
                    <tr key={original.rowId} className="border-b border-line align-top text-ink last:border-0">
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Cargar fila ${original.fila_excel}`}
                          checked={!vista.excluida}
                          onChange={(e) => setExcluida(original.rowId, !e.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-2.5">{original.hoja_origen}</td>
                      <td className="px-3 py-2.5">{original.item_codigo}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5" title={original.tarea ?? ''}>
                        {original.tarea}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          aria-label={`Contrato ${original.item_codigo}`}
                          value={vista.contrato}
                          onChange={(e) => setContratoCascada(original.item_codigo, e.target.value)}
                          className={inputCls}
                        >
                          <option value="">—</option>
                          {(contratosDisponibles ?? []).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {reasignado && (
                          <span
                            className="mt-1 block text-[11px] text-slate"
                            title="El maestro reasignó este ítem al contrato correcto."
                          >
                            archivo: {original.contrato_archivo} → {vista.contrato}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          aria-label={`Provincia ${original.rowId}`}
                          value={vista.provincia}
                          onChange={(e) => setEdicionCampo(original.rowId, 'provincia', e.target.value)}
                          className={inputCls}
                        >
                          <option value="">—</option>
                          {provinciasValidas.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          aria-label={`Cantidad ${original.rowId}`}
                          value={vista.cantidades ?? ''}
                          inputMode="decimal"
                          onChange={(e) => setEdicionCampo(original.rowId, 'cantidades', e.target.value)}
                          className={`${inputCls} w-24 text-right`}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate">{fmtMoney(original.precio_unitario)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          aria-label={`Total ${original.rowId}`}
                          value={vista.total_mes ?? ''}
                          inputMode="decimal"
                          onChange={(e) => setEdicionCampo(original.rowId, 'total_mes', e.target.value)}
                          className={`${inputCls} w-28 text-right`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {vista.excluida ? (
                          <span className={BADGE_EXCLUIDA}>Excluida</span>
                        ) : tieneError ? (
                          <span className={BADGE_WARN} title={detalle ?? ''}>
                            ⚠ {detalle}
                          </span>
                        ) : (
                          <span className={BADGE_OK}>OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {enPagina.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-3 text-sm text-slate">
                      Sin filas para las hojas seleccionadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate">
            <span>
              Página {paginaSegura} de {totalPaginas} — {filasCalculadas.length} fila{filasCalculadas.length === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
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

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button variant="primary" disabled={confirmarMut.isPending} onClick={confirmar}>
              {confirmarMut.isPending ? 'Confirmando…' : 'Confirmar carga'}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && resultado && (
        <div className="max-w-xl space-y-4 rounded-xl border border-line bg-surface p-6">
          <p className="text-ink">
            {resultado.insertadas} fila{resultado.insertadas === 1 ? '' : 's'} insertada{resultado.insertadas === 1 ? '' : 's'} ·{' '}
            {resultado.omitidas} omitida{resultado.omitidas === 1 ? '' : 's'}
          </p>

          {resultado.errores.length > 0 && (
            <div className="space-y-1 rounded-md border border-warn/60 bg-warn/10 p-3 text-xs text-warn">
              {resultado.errores.map((err, i) => (
                <p key={i}>
                  Hoja {err.hoja}, fila {err.fila}, ítem {err.item_codigo}: {err.mensaje}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={cargarOtra}>
              Cargar otra
            </Button>
            <Button variant="primary" onClick={() => router.push('/certificaciones')}>
              Ver resumen
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
