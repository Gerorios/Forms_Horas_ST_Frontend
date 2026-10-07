'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { useSession } from '@/lib/auth/session';
import { useProvincias, useTareas } from '@/lib/api/catalogos';
import { mensajeDeError } from '@/lib/api/liquidacion';
import {
  subirFoto,
  useCatalogosSeguridad,
  useCrearReporte,
  useEditarReporte,
  useInvalidarSeguridad,
  useQuitarFoto,
  type FotoParaSubir,
  type ReporteInput,
  type ReporteSeguridad,
  type TipoReporte,
} from '@/lib/api/seguridad';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import type { EmpleadoBusqueda } from '@/types/domain';
import { FotosGrupo } from './fotos-grupo';
import { CAMPOS_POR_TIPO, TIPOS_PARA_TODOS, TIPO_AYUDA, TIPO_LABEL, faltantes, hoyLocal } from './tipos';

const CAMPO =
  'min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 sm:text-sm';
const TARJETA = 'space-y-4 rounded-xl border border-line bg-surface p-4';
const ROTULO = 'flex flex-col gap-1.5 text-sm font-medium text-ink';

/**
 * Alta y edición (mientras está pendiente) de un Reporte de Seguridad, pensado
 * para el celular. Al guardar: primero el reporte, después las fotos nuevas
 * de a una. Si alguna foto falla, el reporte queda igual y el autor puede
 * sumarla editándolo.
 */
export function ReporteForm({ inicial, onListo }: { inicial?: ReporteSeguridad; onListo: () => void }) {
  const { perfil } = useSession();
  const { data: catalogos } = useCatalogosSeguridad();
  const { data: provincias } = useProvincias();
  const crear = useCrearReporte();
  const editar = useEditarReporte();
  const quitarFoto = useQuitarFoto();
  const invalidar = useInvalidarSeguridad();

  const [tipo, setTipo] = useState<TipoReporte | null>(inicial?.tipo ?? null);
  const [fechaReporte, setFechaReporte] = useState(inicial?.fechaReporte ?? hoyLocal());
  const [provinciaId, setProvinciaId] = useState<number | null>(inicial?.provincia.id ?? null);
  const [contratoId, setContratoId] = useState<number | null>(inicial?.contrato.id ?? null);
  const [tareaId, setTareaId] = useState<number | null>(inicial?.tarea.id ?? null);
  const [ubicacion, setUbicacion] = useState(inicial?.ubicacion ?? '');
  const [naturalezaId, setNaturalezaId] = useState<number | null>(inicial?.naturaleza?.id ?? null);
  const [motivoId, setMotivoId] = useState<number | null>(inicial?.motivoParalizacion?.id ?? null);
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [controlRiesgo, setControlRiesgo] = useState(inicial?.controlRiesgo ?? '');
  const [involucrados, setInvolucrados] = useState<EmpleadoBusqueda[]>(
    (inicial?.involucrados ?? []).map((i) => ({ cuil: i.cuil, apellido_nombre: i.nombre, legajo: 0, cargo: '' })),
  );
  const [fotosNuevas, setFotosNuevas] = useState<FotoParaSubir[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [intentoEnviar, setIntentoEnviar] = useState(false);

  const { data: tareas } = useTareas(contratoId);
  const tipos = useMemo<TipoReporte[]>(
    () => (perfil?.rol.nombre === 'HyS' ? [...TIPOS_PARA_TODOS, 'inspeccion'] : TIPOS_PARA_TODOS),
    [perfil],
  );
  const reglas = tipo ? CAMPOS_POR_TIPO[tipo] : null;
  const pendientes = faltantes({
    tipo,
    naturalezaId,
    motivoParalizacionId: motivoId,
    controlRiesgo,
    involucrados: involucrados.map((i) => i.cuil),
    descripcion,
    fechaReporte,
    provinciaId,
    contratoId,
    tareaId,
  });
  const existentes = inicial?.fotos ?? [];

  function elegirTipo(t: TipoReporte) {
    setTipo(t);
    const r = CAMPOS_POR_TIPO[t];
    // Lo que el tipo nuevo no pide se descarta, para no mandar datos que el
    // backend va a rechazar.
    if (!r.naturaleza) setNaturalezaId(null);
    if (!r.motivoParalizacion) setMotivoId(null);
    if (!r.controlRiesgo) setControlRiesgo('');
    if (r.involucrados === 'no') setInvolucrados([]);
    if (!r.fotosControl) setFotosNuevas((f) => f.filter((x) => x.grupo !== 'control'));
  }

  function construirInput(): ReporteInput {
    return {
      tipo: tipo!,
      fechaReporte,
      provinciaId: provinciaId!,
      contratoId: contratoId!,
      tareaId: tareaId!,
      descripcion: descripcion.trim(),
      ...(ubicacion.trim() ? { ubicacion: ubicacion.trim() } : {}),
      ...(reglas?.naturaleza && naturalezaId != null ? { naturalezaId } : {}),
      ...(reglas?.motivoParalizacion && motivoId != null ? { motivoParalizacionId: motivoId } : {}),
      ...(reglas?.controlRiesgo ? { controlRiesgo: controlRiesgo.trim() } : {}),
      ...(reglas?.involucrados !== 'no' ? { involucrados: involucrados.map((i) => i.cuil) } : {}),
    };
  }

  async function enviar() {
    setIntentoEnviar(true);
    if (pendientes.length > 0) return;
    setEnviando(true);
    try {
      const guardado = inicial
        ? await editar.mutateAsync({ id: inicial.id, input: construirInput() })
        : await crear.mutateAsync(construirInput());
      let fallidas = 0;
      for (const foto of fotosNuevas) {
        try {
          await subirFoto(guardado.id, foto);
        } catch {
          fallidas++;
        }
      }
      await invalidar();
      if (fallidas > 0) {
        toast.warning(
          `El reporte se guardó, pero ${fallidas === 1 ? 'una foto no se subió' : `${fallidas} fotos no se subieron`}. Podés sumarlas editándolo.`,
        );
      } else {
        toast.success(inicial ? 'Reporte actualizado' : 'Reporte enviado. HyS lo va a revisar.');
      }
      onListo();
    } catch (e) {
      toast.error(mensajeDeError(e, 'No se pudo guardar el reporte'));
    } finally {
      setEnviando(false);
    }
  }

  function quitarExistente(fotoId: number) {
    if (!inicial) return;
    toast.promise(quitarFoto.mutateAsync({ reporteId: inicial.id, fotoId }), {
      loading: 'Quitando la foto…',
      success: 'Foto quitada',
      error: (e) => mensajeDeError(e, 'No se pudo quitar la foto'),
    });
  }

  const fotosDe = (grupo: 'riesgo' | 'control') => ({
    existentes: existentes.filter((f) => f.grupo === grupo),
    nuevas: fotosNuevas.filter((f) => f.grupo === grupo),
    onAgregar: (foto: FotoParaSubir) => setFotosNuevas((f) => [...f, foto]),
    onQuitarNueva: (i: number) => {
      const objetivo = fotosNuevas.filter((f) => f.grupo === grupo)[i];
      setFotosNuevas((f) => f.filter((x) => x !== objetivo));
    },
    onQuitarExistente: inicial ? quitarExistente : undefined,
  });

  return (
    <form
      className="mx-auto flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      <section className={TARJETA}>
        <h2 className="font-medium text-ink">¿Qué querés reportar?</h2>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de reporte">
          {tipos.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              onClick={() => elegirTipo(t)}
              className={`min-h-12 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                tipo === t ? 'border-2 border-graphite bg-graphite text-white' : 'border border-line bg-surface text-ink hover:bg-accent/60'
              } ${t === 'inspeccion' ? 'col-span-2' : ''}`}
            >
              {TIPO_LABEL[t]}
            </button>
          ))}
        </div>
        {tipo && <p className="text-sm text-slate">{TIPO_AYUDA[tipo]}</p>}
      </section>

      {tipo && reglas && (
        <>
          <section className={TARJETA}>
            <label className={ROTULO}>
              Fecha en que lo viste
              <input type="date" value={fechaReporte} max={hoyLocal()} onChange={(e) => setFechaReporte(e.target.value)} className={CAMPO} />
              <span className="text-xs font-normal text-slate">El día y la hora de envío se guardan solos.</span>
            </label>
            <label className={ROTULO}>
              Provincia donde pasó
              <select value={provinciaId ?? ''} onChange={(e) => setProvinciaId(e.target.value ? Number(e.target.value) : null)} className={CAMPO}>
                <option value="">Elegí la provincia</option>
                {(provincias ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={ROTULO}>
                Contrato
                <select
                  value={contratoId ?? ''}
                  onChange={(e) => {
                    setContratoId(e.target.value ? Number(e.target.value) : null);
                    setTareaId(null);
                  }}
                  className={CAMPO}
                >
                  <option value="">Elegí</option>
                  {(catalogos?.contratos ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ROTULO}>
                Tarea
                <select
                  value={tareaId ?? ''}
                  disabled={contratoId == null}
                  onChange={(e) => setTareaId(e.target.value ? Number(e.target.value) : null)}
                  className={CAMPO}
                >
                  <option value="">{contratoId == null ? 'Primero el contrato' : 'Elegí'}</option>
                  {(tareas ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <span className="-mt-2 block text-xs text-slate">Si no es de un contrato K, elegí OTROS.</span>
            <label className={ROTULO}>
              <span>
                Ubicación <span className="font-normal text-slate">(opcional)</span>
              </span>
              <input
                type="text"
                maxLength={200}
                value={ubicacion}
                placeholder="Ej.: Ruta 9 km 1580, depósito Salta"
                onChange={(e) => setUbicacion(e.target.value)}
                className={CAMPO}
              />
            </label>
          </section>

          <section className={TARJETA}>
            {reglas.naturaleza && (
              <label className={ROTULO}>
                Naturaleza del riesgo
                <select value={naturalezaId ?? ''} onChange={(e) => setNaturalezaId(e.target.value ? Number(e.target.value) : null)} className={CAMPO}>
                  <option value="">Elegí una</option>
                  {(catalogos?.naturalezas ?? []).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {reglas.motivoParalizacion && (
              <label className={ROTULO}>
                ¿Por qué se detuvo la tarea?
                <select value={motivoId ?? ''} onChange={(e) => setMotivoId(e.target.value ? Number(e.target.value) : null)} className={CAMPO}>
                  <option value="">Elegí un motivo</option>
                  {(catalogos?.motivosParalizacion ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className={ROTULO}>
              {tipo === 'propuesta_mejora' ? 'Tu propuesta' : 'Contá qué viste'}
              <textarea
                rows={4}
                value={descripcion}
                placeholder={tipo === 'propuesta_mejora' ? 'Qué cambiarías y por qué' : 'Describí la situación'}
                onChange={(e) => setDescripcion(e.target.value)}
                className={CAMPO}
              />
            </label>
            {reglas.involucrados !== 'no' && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ink">
                  {reglas.involucrados === 'obligatorio' ? 'Personas observadas' : 'Personas involucradas'}{' '}
                  {reglas.involucrados === 'opcional' && <span className="font-normal text-slate">(opcional)</span>}
                </p>
                {reglas.involucrados === 'obligatorio' && (
                  <p className="text-xs text-slate">Cada una pierde los puntos que le pongas al aprobar la inspección.</p>
                )}
                <OperariosSelect value={involucrados} onChange={setInvolucrados} />
              </div>
            )}
          </section>

          {reglas.controlRiesgo && (
            <section className={TARJETA}>
              <label className={ROTULO}>
                {tipo === 'inspeccion' ? '¿Qué se hizo para controlar el riesgo?' : '¿Qué hiciste vos para controlar el riesgo?'}
                {tipo !== 'inspeccion' && (
                  <span className="text-xs font-normal text-slate">
                    Contá lo que hiciste con tus manos: señalizar, vallar, sacar de uso, ordenar. Avisarle a otro no es
                    gestionar.
                  </span>
                )}
                <textarea
                  rows={3}
                  value={controlRiesgo}
                  placeholder="Ej.: vallé la zanja con cinta y conos"
                  onChange={(e) => setControlRiesgo(e.target.value)}
                  className={CAMPO}
                />
              </label>
            </section>
          )}

          <section className={TARJETA}>
            <FotosGrupo
              titulo={tipo === 'propuesta_mejora' ? 'Fotos' : 'Fotos de lo que viste'}
              grupo="riesgo"
              reporteId={inicial?.id}
              deshabilitado={enviando}
              {...fotosDe('riesgo')}
            />
            {reglas.fotosControl && (
              <FotosGrupo titulo="Fotos de lo que hiciste" grupo="control" reporteId={inicial?.id} deshabilitado={enviando} {...fotosDe('control')} />
            )}
            <p className="text-xs text-slate">
              Las fotos que sacás con la cámara guardan el lugar donde las sacaste, solo en ese momento. La app nunca te sigue.
            </p>
          </section>

          {intentoEnviar && pendientes.length > 0 && (
            <ul role="alert" className="space-y-1 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {pendientes.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}

          <Button type="submit" variant="primary" disabled={enviando} className="min-h-12 text-base font-semibold">
            {enviando ? 'Enviando…' : inicial ? 'Guardar cambios' : 'Enviar reporte'}
          </Button>
          <p className="text-center text-xs text-slate">
            Mientras esté pendiente lo podés editar o anular. HyS lo revisa y, si lo aprueba, sumás puntos.
          </p>
        </>
      )}
    </form>
  );
}
