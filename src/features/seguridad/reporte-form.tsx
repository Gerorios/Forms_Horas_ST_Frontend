'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { useSession } from '@/lib/auth/session';
import { useProvincias, useTareas } from '@/lib/api/catalogos';
import { mensajeDeError } from '@/lib/api/liquidacion';
import {
  subirFoto,
  useCatalogosSeguridad,
  useCorregirReporte,
  useCrearReporte,
  useEditarReporte,
  useInvalidarSeguridad,
  useQuitarFoto,
  type FotoParaSubir,
  type ReporteInput,
  type ReporteSeguridad,
  type TipoReporte,
} from '@/lib/api/seguridad';
import type { EmpleadoBusqueda } from '@/types/domain';
import { PersonasSelect } from './personas-select';
import { ConfirmarDialog } from './confirmar-dialog';
import { FotosGrupo, type FotoNueva } from './fotos-grupo';
import { BotonUbicacion, urlMapa, type PuntoGps } from './boton-ubicacion';
import {
  borrarBorrador,
  guardarBorrador,
  guardarUltimoLugar,
  leerBorrador,
  leerUltimoLugar,
  tieneContenido,
  type Borrador,
  type CamposBorrador,
} from './borrador';
import {
  CAMPOS_POR_TIPO,
  FOCO_VISIBLE,
  TIPOS_PARA_TODOS,
  TIPO_AYUDA,
  TIPO_LABEL,
  faltantesPorCampo,
  fechaHoraLarga,
  hoyLocal,
  type CampoReporte,
} from './tipos';

/** `autor`: alta o edición del propio reporte pendiente. `correccion`: HyS
 * (o Admin) corrige uno ajeno en cualquier estado (ADR-027, 2026-10-08); no
 * toca fotos ni el punto GPS, y si estaba aprobado el backend recalcula. */
export type ModoFormulario = 'autor' | 'correccion';

const CAMPO =
  'min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand-deep focus:ring-2 focus:ring-brand/40 aria-[invalid=true]:border-danger disabled:bg-sand disabled:text-slate sm:text-sm';
const TARJETA = 'space-y-4 rounded-xl border border-line bg-surface p-4';
const ROTULO = 'flex flex-col gap-1.5 text-sm font-medium text-ink';

/** Cada cuánto se guarda el borrador mientras se escribe. */
const ESPERA_BORRADOR_MS = 600;

const idCampo = (c: CampoReporte) => `campo-${c}`;
const idError = (c: CampoReporte) => `error-${c}`;

/** Lleva el foco (y la vista) al campo que falta. Si el id es un contenedor
 * (personas observadas), enfoca el primer control de adentro. */
function enfocarCampo(campo: CampoReporte) {
  const el = document.getElementById(idCampo(campo));
  if (!el) return;
  const foco = el.matches('input,select,textarea,button')
    ? el
    : el.querySelector<HTMLElement>('input,select,textarea,button');
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  foco?.focus({ preventScroll: true });
}

let contadorClaves = 0;
const nuevaClave = () => `f${Date.now()}-${contadorClaves++}`;

/**
 * Alta y edición (mientras está pendiente) de un Reporte de Seguridad, pensado
 * para el celular. En el alta guarda un borrador local (por si la cámara
 * recarga la pestaña o se corta la señal). Al guardar: primero el reporte,
 * después las fotos nuevas de a una, cada una con su estado; si alguna falla,
 * no se pierde: se reintenta desde la misma pantalla.
 */
export function ReporteForm({
  inicial,
  onListo,
  modo = 'autor',
  tipoInicial,
}: {
  inicial?: ReporteSeguridad;
  /** En el alta recibe el id del reporte creado, para mostrarlo como recibo. */
  onListo: (idCreado?: number) => void;
  modo?: ModoFormulario;
  /** Tipo preseleccionado (p. ej. `?tipo=inspeccion` desde el panel de HyS). */
  tipoInicial?: TipoReporte;
}) {
  const correccion = modo === 'correccion';
  const esAlta = !inicial && !correccion;
  const { perfil } = useSession();
  const cuil = perfil?.cuil;
  const { data: catalogos } = useCatalogosSeguridad();
  const { data: provincias } = useProvincias();
  const crear = useCrearReporte();
  const editar = useEditarReporte();
  const corregir = useCorregirReporte();
  const quitarFoto = useQuitarFoto();
  const invalidar = useInvalidarSeguridad();

  const [tipoElegido, setTipoElegido] = useState<TipoReporte | null>(inicial?.tipo ?? null);
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
  const [fotos, setFotos] = useState<FotoNueva[]>([]);
  // Solo el punto tomado con el botón es del reporte; el que sale de una foto
  // se sigue derivando de la foto.
  const [punto, setPunto] = useState<PuntoGps | null>(
    inicial?.punto?.origen === 'gps'
      ? { latitud: inicial.punto.latitud, longitud: inicial.punto.longitud, errorMetros: inicial.punto.errorMetros ?? 0 }
      : null,
  );
  /** Falló el GPS y el autor eligió seguir sin punto (ADR-027, 2026-10-08). */
  const [gpsFallo, setGpsFallo] = useState(false);
  // El back no guarda "sin ubicación": una paralización ya enviada sin punto de
  // GPS se mandó así, y al editarla no se le vuelve a pedir el GPS (desde otro
  // lugar guardaría un punto que no es el de la obra).
  const [sinUbicacion, setSinUbicacion] = useState(
    !esAlta && inicial?.tipo === 'paralizacion' && inicial.punto?.origen !== 'gps',
  );
  const [enviando, setEnviando] = useState(false);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  /** Reporte ya creado en este alta: desde acá solo se completan fotos, nunca
   * se crea otro. */
  const [reporteId, setReporteId] = useState<number | null>(null);
  /** Borrador: `null` mientras se lee; `false` si no hay (o ya se decidió). */
  const [borrador, setBorrador] = useState<Borrador | null | false>(esAlta ? null : false);
  /** Provincia, contrato y tarea vinieron del último reporte enviado. */
  const [precargado, setPrecargado] = useState(false);
  /** Foto ya subida que se va a quitar: pide confirmación (no vuelve). */
  const [quitandoFoto, setQuitandoFoto] = useState<number | null>(null);
  const tiposRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Lo precargado del último reporte que ya no está activo cuenta como vacío
  // (derivado, no un efecto que lo borre).
  const contratoEf =
    precargado && catalogos != null && contratoId != null && !catalogos.contratos.some((c) => c.id === contratoId) ? null : contratoId;
  const { data: tareas } = useTareas(contratoEf);
  const tareaEf =
    contratoEf == null || (precargado && tareas != null && tareaId != null && !tareas.some((t) => t.id === tareaId)) ? null : tareaId;
  // La inspección la ven HyS y los inspectores habilitados; al corregir, HyS
  // puede reclasificar a cualquier tipo.
  const tipos = useMemo<TipoReporte[]>(
    () => (correccion || catalogos?.puedeInspeccionar ? [...TIPOS_PARA_TODOS, 'inspeccion'] : TIPOS_PARA_TODOS),
    [correccion, catalogos],
  );
  // El tipo de la URL vale solo si este usuario puede usarlo.
  const tipoPorUrl = tipoInicial && tipos.includes(tipoInicial) ? tipoInicial : null;
  const tipo = tipoElegido ?? tipoPorUrl;
  const reglas = tipo ? CAMPOS_POR_TIPO[tipo] : null;
  // Una foto sacada con la cámara que trae ubicación también sirve como punto
  // (la de menor error), si no se tomó con el botón.
  const puntoFoto = useMemo<PuntoGps | null>(() => {
    const conPunto = fotos
      .map((f) => f.foto)
      .filter((f) => f.origen === 'camara' && f.ubicacion != null)
      .map((f) => f.ubicacion!);
    if (conPunto.length === 0) return null;
    const mejor = conPunto.reduce((a, b) => (b.errorMetros < a.errorMetros ? b : a));
    return { latitud: mejor.latitud, longitud: mejor.longitud, errorMetros: Math.round(mejor.errorMetros) };
  }, [fotos]);
  const puntoEf = punto ?? puntoFoto;
  const errores = faltantesPorCampo({
    tipo,
    naturalezaId,
    motivoParalizacionId: motivoId,
    controlRiesgo,
    involucrados: involucrados.map((i) => i.cuil),
    descripcion,
    fechaReporte,
    provinciaId,
    contratoId: contratoEf,
    tareaId: tareaEf,
    tienePunto: correccion ? undefined : puntoEf != null,
    sinUbicacion,
    ubicacion,
  });
  const mostrarErrores = intentoEnviar && errores.length > 0;
  const errorDe = (c: CampoReporte) => (intentoEnviar ? errores.find((e) => e.campo === c)?.mensaje : undefined);
  /** Atributos de accesibilidad de un campo que puede faltar. */
  const a11y = (c: CampoReporte) => ({
    id: idCampo(c),
    'aria-invalid': errorDe(c) ? true : undefined,
    'aria-describedby': errorDe(c) ? idError(c) : undefined,
  });
  const existentes = inicial?.fotos ?? [];
  const destinoFotos = inicial?.id ?? reporteId;
  // El alta ya se creó: los datos quedan fijos, solo faltan fotos.
  const soloFotos = esAlta && reporteId != null;
  const fotosFallidas = fotos.filter((f) => f.estado === 'error').length;

  // ---------------------------------------------------------------- borrador

  /** Casi siempre se reporta desde el mismo lugar: provincia, contrato y
   * tarea del último reporte enviado, editables. */
  const precargarLugar = (c: string) => {
    const lugar = leerUltimoLugar(c);
    if (!lugar) return;
    setProvinciaId(lugar.provinciaId);
    setContratoId(lugar.contratoId);
    setTareaId(lugar.tareaId);
    setPrecargado(true);
  };

  useEffect(() => {
    if (!esAlta || !cuil) return;
    let cancelado = false;
    leerBorrador(cuil).then((b) => {
      if (cancelado) return;
      const hay = b && tieneContenido(b.campos);
      setBorrador(hay ? b : false);
      if (!hay) precargarLugar(cuil);
    });
    return () => {
      cancelado = true;
    };
  }, [esAlta, cuil]);

  const campos: CamposBorrador = {
    tipo,
    fechaReporte,
    provinciaId,
    contratoId: contratoEf,
    tareaId: tareaEf,
    ubicacion,
    naturalezaId,
    motivoId,
    descripcion,
    controlRiesgo,
    involucrados,
    punto,
  };
  const firmaBorrador = JSON.stringify(campos) + fotos.map((f) => `${f.clave}:${f.estado}`).join(',') + String(reporteId);

  // Autosave: solo en el alta y cuando ya se decidió qué hacer con el
  // borrador anterior (si no, se pisaría con el formulario vacío).
  useEffect(() => {
    if (!esAlta || !cuil || borrador !== false || !tieneContenido(campos)) return;
    const t = setTimeout(() => {
      void guardarBorrador(cuil, {
        campos,
        fotos: fotos.filter((f) => f.estado !== 'ok').map((f) => f.foto),
        reporteId,
      });
    }, ESPERA_BORRADOR_MS);
    return () => clearTimeout(t);
    // `firmaBorrador` resume todo lo que se guarda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAlta, cuil, borrador, firmaBorrador]);

  function seguirBorrador(b: Borrador) {
    const c = b.campos;
    setTipoElegido(c.tipo);
    setFechaReporte(c.fechaReporte);
    setProvinciaId(c.provinciaId);
    setContratoId(c.contratoId);
    setTareaId(c.tareaId);
    setUbicacion(c.ubicacion);
    setNaturalezaId(c.naturalezaId);
    setMotivoId(c.motivoId);
    setDescripcion(c.descripcion);
    setControlRiesgo(c.controlRiesgo);
    setInvolucrados(c.involucrados);
    setPunto(c.punto);
    setFotos(b.fotos.map((foto) => ({ clave: nuevaClave(), foto, estado: b.reporteId != null ? 'error' : 'pendiente' })));
    setReporteId(b.reporteId);
    setBorrador(false);
  }

  function descartarBorrador() {
    if (cuil) {
      void borrarBorrador(cuil);
      precargarLugar(cuil);
    }
    setBorrador(false);
  }


  // ------------------------------------------------------------------ campos

  function elegirTipo(t: TipoReporte) {
    setTipoElegido(t);
    const r = CAMPOS_POR_TIPO[t];
    // Lo que el tipo nuevo no pide se descarta, para no mandar datos que el
    // backend va a rechazar.
    if (!r.naturaleza) setNaturalezaId(null);
    if (!r.motivoParalizacion) setMotivoId(null);
    if (!r.controlRiesgo) setControlRiesgo('');
    if (r.involucrados === 'no') setInvolucrados([]);
    if (!r.fotosControl) setFotos((f) => f.filter((x) => x.foto.grupo !== 'control'));
  }

  function construirInput(): ReporteInput {
    return {
      tipo: tipo!,
      fechaReporte,
      provinciaId: provinciaId!,
      contratoId: contratoEf!,
      tareaId: tareaEf!,
      descripcion: descripcion.trim(),
      ...(ubicacion.trim() ? { ubicacion: ubicacion.trim() } : {}),
      ...(puntoEf ? { latitud: puntoEf.latitud, longitud: puntoEf.longitud, errorMetros: puntoEf.errorMetros } : {}),
      ...(!puntoEf && sinUbicacion ? { sinUbicacion: true } : {}),
      ...(reglas?.naturaleza && naturalezaId != null ? { naturalezaId } : {}),
      ...(reglas?.motivoParalizacion && motivoId != null ? { motivoParalizacionId: motivoId } : {}),
      ...(reglas?.controlRiesgo ? { controlRiesgo: controlRiesgo.trim() } : {}),
      ...(reglas?.involucrados !== 'no' ? { involucrados: involucrados.map((i) => i.cuil) } : {}),
    };
  }

  // ------------------------------------------------------------------- fotos

  const marcar = (clave: string, estado: FotoNueva['estado']) =>
    setFotos((lista) => lista.map((f) => (f.clave === clave ? { ...f, estado } : f)));

  async function subirUna(id: number, f: FotoNueva): Promise<boolean> {
    marcar(f.clave, 'subiendo');
    try {
      await subirFoto(id, f.foto);
      marcar(f.clave, 'ok');
      return true;
    } catch {
      marcar(f.clave, 'error');
      return false;
    }
  }

  /** Sube las que faltan (pendientes y fallidas). Devuelve cuántas fallaron. */
  async function subirFaltantes(id: number): Promise<number> {
    let fallidas = 0;
    for (const f of fotos.filter((x) => x.estado === 'pendiente' || x.estado === 'error')) {
      if (!(await subirUna(id, f))) fallidas++;
    }
    return fallidas;
  }

  async function terminar(mensaje: string, idCreado?: number) {
    if (esAlta && cuil) {
      await borrarBorrador(cuil);
      if (provinciaId != null && contratoEf != null && tareaEf != null) {
        guardarUltimoLugar(cuil, { provinciaId, contratoId: contratoEf, tareaId: tareaEf });
      }
    }
    toast.success(mensaje);
    onListo(esAlta ? (idCreado ?? reporteId ?? undefined) : undefined);
  }

  async function reintentarUna(clave: string) {
    const f = fotos.find((x) => x.clave === clave);
    if (!f || destinoFotos == null) return;
    const ok = await subirUna(destinoFotos, f);
    await invalidar();
    if (ok && soloFotos && fotos.every((x) => x.clave === clave || x.estado === 'ok')) {
      await terminar('Listo: el reporte y todas sus fotos se enviaron.', destinoFotos);
    }
  }

  // ------------------------------------------------------------------ enviar

  async function enviar() {
    setIntentoEnviar(true);
    if (errores.length > 0) {
      enfocarCampo(errores[0].campo);
      return;
    }
    setEnviando(true);
    try {
      if (correccion && inicial) {
        await corregir.mutateAsync({ id: inicial.id, input: construirInput() });
        toast.success(inicial.estado === 'aprobado' ? 'Reporte corregido. Los puntos se recalcularon.' : 'Reporte corregido');
        onListo();
        return;
      }
      let id = destinoFotos;
      if (inicial) {
        await editar.mutateAsync({ id: inicial.id, input: construirInput() });
      } else if (id == null) {
        id = (await crear.mutateAsync(construirInput())).id;
        setReporteId(id);
      }
      const fallidas = await subirFaltantes(id!);
      await invalidar();
      if (fallidas > 0) {
        toast.warning(
          `${inicial ? 'Los cambios se guardaron' : 'El reporte se envió'}, pero ${
            fallidas === 1 ? 'una foto no se subió' : `${fallidas} fotos no se subieron`
          }. Reintentalas abajo cuando tengas señal.`,
        );
        return;
      }
      await terminar(inicial ? 'Reporte actualizado' : 'Reporte enviado. HyS lo va a revisar.', id ?? undefined);
    } catch (e) {
      toast.error(`${mensajeDeError(e, 'No se pudo guardar el reporte')}. Lo que cargaste quedó guardado en este celular.`);
    } finally {
      setEnviando(false);
    }
  }

  function quitarExistente(fotoId: number) {
    if (!inicial) return;
    setQuitandoFoto(null);
    toast.promise(quitarFoto.mutateAsync({ reporteId: inicial.id, fotoId }), {
      loading: 'Quitando la foto…',
      success: 'Foto quitada',
      error: (e) => mensajeDeError(e, 'No se pudo quitar la foto'),
    });
  }

  const fotosDe = (grupo: 'riesgo' | 'control') => ({
    existentes: existentes.filter((f) => f.grupo === grupo),
    nuevas: fotos.filter((f) => f.foto.grupo === grupo),
    onAgregar: (foto: FotoParaSubir) => setFotos((f) => [...f, { clave: nuevaClave(), foto, estado: 'pendiente' }]),
    onQuitarNueva: (clave: string) => setFotos((f) => f.filter((x) => x.clave !== clave)),
    // Una foto ya subida no vuelve: se confirma antes de quitarla.
    onQuitarExistente: inicial ? (fotoId: number) => setQuitandoFoto(fotoId) : undefined,
    onReintentar: (clave: string) => void reintentarUna(clave),
  });

  // Funciones que devuelven JSX (no componentes): un componente definido acá
  // adentro se remontaría en cada tecla y el campo perdería el foco.
  /** Radiogroup del tipo: una sola parada de Tab y flechas que mueven y
   * eligen (patrón ARIA radio). */
  const indiceTipo = tipo ? tipos.indexOf(tipo) : -1;
  function teclaTipo(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const paso = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const siguiente = (i + paso + tipos.length) % tipos.length;
    elegirTipo(tipos[siguiente]);
    tiposRef.current[siguiente]?.focus();
  }

  const mensajeCampo = (campo: CampoReporte): ReactNode => {
    const m = errorDe(campo);
    return m ? (
      <span id={idError(campo)} className="text-xs font-medium text-danger">
        {m}
      </span>
    ) : null;
  };

  return (
    <form
      className="mx-auto flex max-w-xl flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      {borrador && (
        <div role="status" className="space-y-3 rounded-xl border border-brand/50 bg-accent p-4">
          <p className="text-sm text-ink">
            <span className="font-semibold">Tenés un reporte sin enviar</span>
            {borrador.campos.tipo ? ` (${TIPO_LABEL[borrador.campos.tipo].toLowerCase()})` : ''}, guardado el{' '}
            {fechaHoraLarga(borrador.guardadoEn)}.
            {borrador.reporteId != null && ' Ya se envió; le faltan fotos.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" className="min-h-11" onClick={() => seguirBorrador(borrador)}>
              Seguir con ese
            </Button>
            <Button variant="secondary" className="min-h-11" onClick={descartarBorrador}>
              Descartar
            </Button>
          </div>
        </div>
      )}

      <fieldset disabled={soloFotos || !!borrador} className="contents">
        <section className={TARJETA}>
          <h2 className="font-medium text-ink">¿Qué querés reportar?</h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de reporte" aria-describedby={errorDe('tipo') ? idError('tipo') : undefined}>
            {tipos.map((t, i) => (
              <button
                key={t}
                ref={(el) => {
                  tiposRef.current[i] = el;
                }}
                id={i === 0 ? idCampo('tipo') : undefined}
                type="button"
                role="radio"
                aria-checked={tipo === t}
                tabIndex={i === (indiceTipo >= 0 ? indiceTipo : 0) ? 0 : -1}
                onKeyDown={(e) => teclaTipo(e, i)}
                onClick={() => elegirTipo(t)}
                className={`min-h-12 rounded-lg px-2 py-2 text-sm font-semibold transition disabled:opacity-60 ${FOCO_VISIBLE} ${
                  tipo === t ? 'border-2 border-graphite bg-graphite text-white' : 'border border-line bg-surface text-ink hover:bg-accent/60'
                } ${t === 'inspeccion' ? 'col-span-2' : ''}`}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>
          {mensajeCampo('tipo')}
          {tipo && <p className="text-sm text-slate">{TIPO_AYUDA[tipo]}</p>}
        </section>

        {tipo && reglas && (
          <>
            <section className={TARJETA}>
              <label className={ROTULO}>
                Fecha en que lo viste
                <input type="date" value={fechaReporte} max={hoyLocal()} onChange={(e) => setFechaReporte(e.target.value)} className={CAMPO} {...a11y('fechaReporte')} />
                <span className="text-xs font-normal text-slate">El día y la hora de envío se guardan solos.</span>
                {mensajeCampo('fechaReporte')}
              </label>
              <label className={ROTULO}>
                Provincia donde pasó
                <select value={provinciaId ?? ''} onChange={(e) => setProvinciaId(e.target.value ? Number(e.target.value) : null)} className={CAMPO} {...a11y('provinciaId')}>
                  <option value="">Elegí la provincia</option>
                  {(provincias ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                {mensajeCampo('provinciaId')}
              </label>
              {precargado && esAlta && (
                <p className="-mt-2 text-xs text-slate">Provincia, contrato y tarea precargados de tu último reporte: cambialos si hace falta.</p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={ROTULO}>
                    Contrato
                    <select
                      value={contratoEf ?? ''}
                      onChange={(e) => {
                        setContratoId(e.target.value ? Number(e.target.value) : null);
                        setTareaId(null);
                      }}
                      className={CAMPO}
                      {...a11y('contratoId')}
                      aria-describedby={[errorDe('contratoId') ? idError('contratoId') : null, 'ayuda-contrato'].filter(Boolean).join(' ')}
                    >
                      <option value="">Elegí</option>
                      {(catalogos?.contratos ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} · {c.nombre}
                        </option>
                      ))}
                    </select>
                    {mensajeCampo('contratoId')}
                  </label>
                  <span id="ayuda-contrato" className="text-xs text-slate">
                    Si no es de un contrato K, elegí OTROS.
                  </span>
                </div>
                <label className={ROTULO}>
                  Tarea
                  <select
                    value={tareaEf ?? ''}
                    disabled={contratoEf == null}
                    onChange={(e) => setTareaId(e.target.value ? Number(e.target.value) : null)}
                    className={CAMPO}
                    {...a11y('tareaId')}
                  >
                    <option value="">{contratoEf == null ? 'Primero el contrato' : 'Elegí'}</option>
                    {(tareas ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                  {mensajeCampo('tareaId')}
                </label>
              </div>
              {correccion ? (
                inicial?.punto && (
                  <p className="text-sm text-slate">
                    Punto en el mapa: ±{inicial.punto.errorMetros ?? '?'} m ({inicial.punto.origen === 'gps' ? 'GPS' : 'foto'}) ·{' '}
                    <a href={urlMapa(inicial.punto)} target="_blank" rel="noreferrer" className="text-brand-deep underline">
                      ver
                    </a>
                  </p>
                )
              ) : (
                <div className="space-y-1">
                  <BotonUbicacion
                    valor={punto}
                    onChange={setPunto}
                    obligatorio={reglas.puntoGps === 'obligatorio'}
                    deshabilitado={enviando || soloFotos}
                    idCampo={idCampo('punto')}
                    idError={errorDe('punto') ? idError('punto') : undefined}
                    onFallo={() => setGpsFallo(true)}
                  />
                  {mensajeCampo('punto')}
                  {!punto && puntoFoto && (
                    <p className="text-sm text-ink">Se usa la ubicación de tu foto de cámara (±{puntoFoto.errorMetros} m).</p>
                  )}
                  {reglas.puntoGps === 'obligatorio' && !puntoEf && gpsFallo && !sinUbicacion && (
                    <button
                      type="button"
                      onClick={() => setSinUbicacion(true)}
                      className={`inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-2 ${FOCO_VISIBLE}`}
                    >
                      No puedo tomar la ubicación
                    </button>
                  )}
                  {reglas.puntoGps === 'obligatorio' && !puntoEf && sinUbicacion && (
                    <div className="space-y-1 rounded-lg border border-line bg-sand-deep px-3 py-2 text-sm text-ink">
                      <p>Se envía sin ubicación GPS. Contá abajo dónde fue: obra, calle o una referencia para encontrarla.</p>
                      <button
                        type="button"
                        onClick={() => setSinUbicacion(false)}
                        className={`inline-flex min-h-11 items-center underline underline-offset-2 ${FOCO_VISIBLE}`}
                      >
                        Volver a intentar con el GPS
                      </button>
                    </div>
                  )}
                </div>
              )}
              <label className={ROTULO}>
                <span>
                  Referencia del lugar{' '}
                  <span className="font-normal text-slate">
                    {reglas.puntoGps === 'obligatorio' && !puntoEf && sinUbicacion ? '(obligatoria sin GPS)' : '(opcional)'}
                  </span>
                </span>
                <input
                  type="text"
                  maxLength={200}
                  value={ubicacion}
                  placeholder="Ej.: Ruta 9 km 1580, depósito Salta"
                  onChange={(e) => setUbicacion(e.target.value)}
                  className={CAMPO}
                  {...a11y('ubicacion')}
                />
                {mensajeCampo('ubicacion')}
              </label>
            </section>

            <section className={TARJETA}>
              {reglas.naturaleza && (
                <label className={ROTULO}>
                  Naturaleza del riesgo
                  <select value={naturalezaId ?? ''} onChange={(e) => setNaturalezaId(e.target.value ? Number(e.target.value) : null)} className={CAMPO} {...a11y('naturalezaId')}>
                    <option value="">Elegí una</option>
                    {(catalogos?.naturalezas ?? []).map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nombre}
                      </option>
                    ))}
                  </select>
                  {mensajeCampo('naturalezaId')}
                </label>
              )}
              {reglas.motivoParalizacion && (
                <label className={ROTULO}>
                  ¿Por qué se detuvo la tarea?
                  <select value={motivoId ?? ''} onChange={(e) => setMotivoId(e.target.value ? Number(e.target.value) : null)} className={CAMPO} {...a11y('motivoParalizacionId')}>
                    <option value="">Elegí un motivo</option>
                    {(catalogos?.motivosParalizacion ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  {mensajeCampo('motivoParalizacionId')}
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
                  {...a11y('descripcion')}
                />
                {mensajeCampo('descripcion')}
              </label>
              {reglas.involucrados !== 'no' && (
                <div className="space-y-1.5">
                  <PersonasSelect
                    id={idCampo('involucrados')}
                    label={
                      reglas.involucrados === 'obligatorio' ? (
                        'Personas observadas'
                      ) : (
                        <>
                          Personas involucradas <span className="font-normal text-slate">(opcional)</span>
                        </>
                      )
                    }
                    ayuda={
                      reglas.involucrados === 'obligatorio'
                        ? 'Cada una pierde los puntos que le pongas al aprobar la inspección.'
                        : 'Nombrarlas no les resta puntos: sirve para que HyS sepa quién estaba.'
                    }
                    value={involucrados}
                    onChange={setInvolucrados}
                    idError={errorDe('involucrados') ? idError('involucrados') : undefined}
                  />
                  {mensajeCampo('involucrados')}
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
                    {...a11y('controlRiesgo')}
                  />
                  {mensajeCampo('controlRiesgo')}
                </label>
              </section>
            )}
          </>
        )}
      </fieldset>

      {tipo && reglas && (
        <>
          {correccion ? (
            <p className="text-xs text-slate">
              Las fotos no se tocan al corregir. Si el tipo nuevo no lleva fotos del control, esas se descartan (quedan en la
              auditoría).
            </p>
          ) : (
            <section className={TARJETA}>
              <FotosGrupo
                titulo={tipo === 'propuesta_mejora' ? 'Fotos' : 'Fotos de lo que viste'}
                grupo="riesgo"
                reporteId={inicial?.id}
                deshabilitado={enviando || !!borrador}
                bloquearAgregado={soloFotos}
                {...fotosDe('riesgo')}
              />
              {reglas.fotosControl && (
                <FotosGrupo
                  titulo="Fotos de lo que hiciste"
                  grupo="control"
                  reporteId={inicial?.id}
                  deshabilitado={enviando || !!borrador}
                  bloquearAgregado={soloFotos}
                  {...fotosDe('control')}
                />
              )}
              <p className="text-xs text-slate">
                Las fotos que sacás con la cámara guardan el lugar donde las sacaste, solo en ese momento. La app nunca te sigue.
              </p>
            </section>
          )}

          {mostrarErrores && (
            <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              <p className="font-semibold">Para enviarlo falta:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {errores.map((e) => (
                  <li key={e.campo}>{e.mensaje}</li>
                ))}
              </ul>
            </div>
          )}

          {soloFotos ? (
            <div role="status" className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <p className="text-sm text-ink">
                <span className="font-semibold">El reporte ya se envió.</span>{' '}
                {fotosFallidas > 0
                  ? `${fotosFallidas === 1 ? 'Una foto no se subió' : `${fotosFallidas} fotos no se subieron`}: reintentalas cuando tengas señal.`
                  : 'Subiendo las fotos…'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="submit" variant="primary" disabled={enviando} className="min-h-12 font-semibold">
                  {enviando ? 'Subiendo…' : 'Reintentar fotos'}
                </Button>
                <Button variant="secondary" disabled={enviando} className="min-h-12" onClick={() => void terminar('Reporte enviado. Las fotos que faltaban no se subieron.')}>
                  Terminar sin estas fotos
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button type="submit" variant="primary" disabled={enviando || !!borrador} className="min-h-12 text-base font-semibold">
                {enviando ? 'Enviando…' : correccion ? 'Guardar corrección' : inicial ? 'Guardar cambios' : 'Enviar reporte'}
              </Button>
              {!correccion && (
                <p className="text-center text-xs text-slate">
                  Mientras esté pendiente lo podés editar o anular. HyS lo revisa y, si lo aprueba, sumás puntos.
                </p>
              )}
            </>
          )}
        </>
      )}
      {quitandoFoto != null && (
        <ConfirmarDialog
          titulo="Quitar esta foto"
          detalle="La foto ya está subida en el reporte. Si la quitás, deja de verse; para volver a tenerla hay que subirla de nuevo."
          verbo="Quitar foto"
          variante="danger-solid"
          ocupado={quitarFoto.isPending}
          onCancelar={() => setQuitandoFoto(null)}
          onConfirmar={() => quitarExistente(quitandoFoto)}
        />
      )}
    </form>
  );
}
