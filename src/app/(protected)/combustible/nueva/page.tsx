'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/session';
import { useProvincias, useMoviles } from '@/lib/api/catalogos';
import {
  useEstacionesServicio,
  useTiposCombustible,
  useUltimoKm,
  useCrearCargaCombustible,
  useExtraerTicket,
} from '@/lib/api/combustible';
import { FotoTicket } from '@/features/combustible/foto-ticket';
import { advertenciaKm } from '@/features/combustible/validaciones';
import { ContratoTareas } from '@/features/combustible/contrato-tareas';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import type { MedioPagoCombustible } from '@/types/domain';

const CAMPOS_SUGERIBLES = [
  'litros',
  'monto',
  'fechaCarga',
  'nroComprobante',
  'tipoCombustibleId',
  'estacionId',
  'movilId',
  'km',
] as const;
type CampoSugerible = (typeof CAMPOS_SUGERIBLES)[number];

const fmtCuit = (c: string) => `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;

function hoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-4 border-l-[3px] border-brand pl-2.5 font-display text-sm font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BadgeSugerido() {
  return (
    <span className="ml-2 rounded-full border border-brand/60 bg-accent px-1.5 py-0.5 text-[10px] font-medium text-brand-deep">
      sugerido por IA
    </span>
  );
}

/** El ticket se lee dos veces: si las lecturas no coincidieron en este campo (o
 * la cuenta no cerró), no se completa nada y se pide revisarlo contra la foto
 * — plan 2026-08-18, "mejor vacío que equivocado". */
function BadgeRevisar() {
  return (
    <span
      className="ml-2 rounded-full border border-warn/60 bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn"
      title="La lectura automática no fue concluyente: verificá este dato con la foto."
    >
      ⚠ revisá con la foto
    </span>
  );
}

const CLASES_CONFIANZA: Record<'alta' | 'media' | 'baja', string> = {
  alta: 'bg-approved/10 text-approved',
  media: 'bg-warn/10 text-warn',
  baja: 'bg-danger/10 text-danger',
};

function ChipConfianza({ confianza }: { confianza: 'alta' | 'media' | 'baja' }) {
  return (
    <span
      className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CLASES_CONFIANZA[confianza]}`}
    >
      Confianza: {confianza}
    </span>
  );
}

export default function NuevaCargaCombustiblePage() {
  const router = useRouter();
  const { perfil } = useSession();
  const contratos = (perfil?.contratosHabilitados ?? []).map((c) => c.contrato);
  const { data: moviles } = useMoviles();
  const { data: provincias } = useProvincias();
  const { data: estaciones } = useEstacionesServicio();
  const { data: tipos } = useTiposCombustible();
  const extraerTicket = useExtraerTicket();
  const crear = useCrearCargaCombustible();

  const [foto, setFoto] = useState<Blob | null>(null);
  const [noLegible, setNoLegible] = useState(false);
  const [sugeridos, setSugeridos] = useState<Set<CampoSugerible>>(new Set());
  const fechaTocadaRef = useRef(false);

  const [movilId, setMovilId] = useState<number | null>(null);
  const [km, setKm] = useState<number | null>(null);
  const [kmConfirmado, setKmConfirmado] = useState(false);
  const [fecha, setFecha] = useState(hoyISO());
  const [litros, setLitros] = useState<number | null>(null);
  const [monto, setMonto] = useState<number | null>(null);
  const [medioPago, setMedioPago] = useState<MedioPagoCombustible | null>(null);
  const [nroComprobante, setNroComprobante] = useState('');
  const [estacionId, setEstacionId] = useState<number | null>(null);
  const [tipoCombustibleId, setTipoCombustibleId] = useState<number | null>(null);
  const [provinciaId, setProvinciaId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [tareaIds, setTareaIds] = useState<number[]>([]);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [medioPagoSugerido, setMedioPagoSugerido] = useState<MedioPagoCombustible | null>(null);
  const [confianzaNumero, setConfianzaNumero] = useState<'alta' | 'media' | 'baja' | null>(null);
  const [lineaOrigenNumero, setLineaOrigenNumero] = useState<string | null>(null);
  const [advertenciaCoherencia, setAdvertenciaCoherencia] = useState<string | null>(null);
  // Campos donde las dos lecturas del ticket no coincidieron: vienen vacíos y
  // se marcan para que el operario los complete mirando la foto.
  const [inseguros, setInseguros] = useState<Set<string>>(new Set());
  const [duplicado, setDuplicado] = useState<{ cargaId: number } | null>(null);
  const [patenteSinMatch, setPatenteSinMatch] = useState<string | null>(null);
  const [tipoSinMatch, setTipoSinMatch] = useState<string | null>(null);
  const [cuitSinMatch, setCuitSinMatch] = useState<string | null>(null);

  // Refs espejo del estado "tiene valor/tocado" por campo sugerible. Se actualizan
  // sincrónicamente en cada onChange y al setear un valor (incluidas las sugerencias
  // de IA), y se leen — también sincrónicamente — en elegirFoto para decidir qué
  // sugerencias aplican. Nunca se leen ni escriben dentro de un updater funcional de
  // setState: los updaters deben quedar puros (React/StrictMode puede invocarlos más
  // de una vez o fuera de orden).
  const litrosTocadoRef = useRef(false);
  const montoTocadoRef = useRef(false);
  const nroComprobanteTocadoRef = useRef(false);
  const tipoCombustibleTocadoRef = useRef(false);
  const estacionTocadaRef = useRef(false);
  const medioPagoTocadoRef = useRef(false);
  const movilTocadoRef = useRef(false);
  const kmTocadoRef = useRef(false);

  const { data: ultimoKmData } = useUltimoKm(movilId);
  const ultimoKm = ultimoKmData?.km ?? null;

  function quitarSugerido(campo: CampoSugerible) {
    setSugeridos((s) => {
      if (!s.has(campo)) return s;
      const n = new Set(s);
      n.delete(campo);
      return n;
    });
  }

  async function elegirFoto(blob: Blob) {
    setFoto(blob);
    setNoLegible(false);
    setMedioPagoSugerido(null);
    setConfianzaNumero(null);
    setLineaOrigenNumero(null);
    setAdvertenciaCoherencia(null);
    setPatenteSinMatch(null);
    setTipoSinMatch(null);
    setCuitSinMatch(null);
    try {
      const resultado = await extraerTicket.mutateAsync(blob);
      if (resultado.legible === false) setNoLegible(true);
      const s = resultado.sugerencias;
      if (!s) return;

      // Decisión síncrona de qué sugerencias aplican, leyendo las refs espejo del
      // estado "tocado/con valor" de cada campo (actualizadas en cada onChange). Así
      // evitamos updaters funcionales impuros: si el usuario tipeó mientras "Leyendo
      // el ticket…" estaba en vuelo, la ref ya refleja eso y la sugerencia no pisa lo
      // que el usuario escribió. `aplicados` se calcula acá mismo, no dentro de un
      // setState, y se usa para UN solo setSugeridos + setters planos.
      const aplicados = new Set<CampoSugerible>();

      if (s.litros != null && !litrosTocadoRef.current) {
        litrosTocadoRef.current = true;
        setLitros(s.litros as number);
        aplicados.add('litros');
      }
      if (s.monto != null && !montoTocadoRef.current) {
        montoTocadoRef.current = true;
        setMonto(s.monto as number);
        aplicados.add('monto');
      }
      if (s.nroComprobante != null && !nroComprobanteTocadoRef.current) {
        nroComprobanteTocadoRef.current = true;
        setNroComprobante(s.nroComprobante as string);
        aplicados.add('nroComprobante');
      }
      if (s.tipoCombustibleId != null && !tipoCombustibleTocadoRef.current) {
        tipoCombustibleTocadoRef.current = true;
        setTipoCombustibleId(s.tipoCombustibleId as number);
        aplicados.add('tipoCombustibleId');
      }
      if (s.estacionId != null && !estacionTocadaRef.current) {
        estacionTocadaRef.current = true;
        setEstacionId(s.estacionId as number);
        aplicados.add('estacionId');
      }
      if (s.fechaCarga != null && !fechaTocadaRef.current) {
        // "Vacío" para la fecha es "no tocada por el usuario todavía" (fechaTocadaRef),
        // no fecha === '': el campo arranca con hoyISO() por defecto, pero el ticket
        // puede ser de otro día — la IA debe poder corregirlo hasta que el usuario
        // edite la fecha a mano.
        fechaTocadaRef.current = true;
        setFecha(s.fechaCarga as string);
        aplicados.add('fechaCarga');
      }

      // El móvil solo se pre-selecciona si el id sugerido existe en el maestro de
      // móviles (useMoviles). Si no existe (o no vino), no se aplica nada y se deja
      // el hint de patente sin match más abajo.
      const movilAplicable = s.movilId != null && (moviles ?? []).some((m) => m.id === s.movilId);
      if (movilAplicable && !movilTocadoRef.current) {
        movilTocadoRef.current = true;
        setMovilId(s.movilId as number);
        setKmConfirmado(false);
        aplicados.add('movilId');
      }
      if (s.km != null && !kmTocadoRef.current) {
        kmTocadoRef.current = true;
        setKm(s.km as number);
        setKmConfirmado(false);
        aplicados.add('km');
      }
      setPatenteSinMatch(s.patente != null && !movilAplicable ? s.patente : null);
      // Hints "leído pero sin match" (mismo criterio que la patente: solo aviso, sin auto-alta).
      setTipoSinMatch(s.tipoCombustibleLeido != null && s.tipoCombustibleId == null ? s.tipoCombustibleLeido : null);
      setCuitSinMatch(s.cuitEstacionLeido != null && s.estacionId == null ? s.cuitEstacionLeido : null);

      if (aplicados.size > 0) {
        setSugeridos((prev) => new Set([...prev, ...aplicados]));
      }

      // Sugerencias v2 (medio de pago, confianza, línea de origen y coherencia): son
      // avisos blandos, no campos "aplicados con badge" — se guardan en su propio
      // estado y nunca bloquean el submit.
      setMedioPagoSugerido(s.medioPagoSugerido ?? null);
      setConfianzaNumero(s.confianzaNumero ?? null);
      setLineaOrigenNumero(s.lineaOrigenNumero ?? null);
      setAdvertenciaCoherencia(s.advertenciaCoherencia ?? null);
      // Mapeo de los nombres del backend a los campos del formulario.
      const ALIAS_CAMPO: Record<string, string> = { kilometraje: 'km', fecha: 'fechaCarga' };
      setInseguros(new Set((s.camposInseguros ?? []).map((c) => ALIAS_CAMPO[c] ?? c)));
      setDuplicado(s.alertaDuplicado ?? null);
      // A propósito NO marca medioPagoTocadoRef: una foto nueva puede re-sugerir el medio de pago (no pisa nada tipeado).
      if (s.medioPagoSugerido != null && !medioPagoTocadoRef.current) {
        setMedioPago(s.medioPagoSugerido);
      }
    } catch {
      // el toast/banner de "no se pudo leer" se maneja abajo; no bloqueamos el alta manual
      setNoLegible(true);
    }
  }

  function toggleTarea(id: number) {
    setTareaIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const advertencia = km != null ? advertenciaKm(km, ultimoKm) : null;

  const contradiccionMedioPago =
    medioPagoSugerido != null && medioPago != null && medioPago !== medioPagoSugerido
      ? medioPagoSugerido === 'cuenta_corriente'
        ? 'La foto parece un remito (cuenta corriente).'
        : 'La foto parece una factura o tique (caja).'
      : null;

  const formularioValido = useMemo(
    () =>
      foto != null &&
      movilId != null &&
      fecha !== '' &&
      litros != null &&
      litros > 0 &&
      monto != null &&
      monto > 0 &&
      km != null &&
      km >= 0 &&
      medioPago != null &&
      nroComprobante.trim() !== '' &&
      estacionId != null &&
      tipoCombustibleId != null &&
      provinciaId != null &&
      tareaIds.length > 0 &&
      (advertencia == null || kmConfirmado),
    [
      foto,
      movilId,
      fecha,
      litros,
      monto,
      km,
      medioPago,
      nroComprobante,
      estacionId,
      tipoCombustibleId,
      provinciaId,
      tareaIds,
      advertencia,
      kmConfirmado,
    ],
  );

  async function enviar() {
    if (!foto) return;
    const form = new FormData();
    form.append('fechaCarga', fecha);
    form.append('movilId', String(movilId));
    form.append('litros', String(litros));
    form.append('monto', String(monto));
    form.append('km', String(km));
    form.append('medioPago', String(medioPago));
    form.append('nroComprobante', nroComprobante.trim());
    form.append('estacionId', String(estacionId));
    form.append('tipoCombustibleId', String(tipoCombustibleId));
    form.append('provinciaId', String(provinciaId));
    if (observaciones.trim() !== '') form.append('observaciones', observaciones.trim());
    form.append('tareaIds', JSON.stringify(tareaIds));
    form.append('foto', foto, 'ticket.jpg');

    const promesa = crear.mutateAsync(form);
    toast.promise(promesa, {
      loading: 'Guardando la carga…',
      success: 'Carga de combustible registrada',
      error: (e: unknown) =>
        String(
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'No se pudo registrar la carga',
        ),
    });
    try {
      await promesa;
      router.push('/combustible');
    } catch {
      // el toast.promise ya avisó el error
    }
  }

  function intentarEnviar() {
    setIntentoEnviar(true);
    if (!formularioValido) return;
    enviar();
  }

  const labelComprobante = medioPago === 'cuenta_corriente' ? 'N° de remito' : 'N° de factura';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Combustible" title="Nueva carga" />

      <Card title="Foto del ticket">
        <FotoTicket onFoto={elegirFoto} cargando={extraerTicket.isPending} />
        {noLegible && (
          <p className="mt-3 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            No pudimos leer el ticket. Podés sacar una foto mejor o completar los datos a mano.
          </p>
        )}
        {intentoEnviar && !foto && (
          <p className="mt-2 text-[11px] text-danger">Sacá una foto del ticket para continuar.</p>
        )}
        {duplicado && (
          <p className="mt-3 rounded-md border border-danger/60 bg-danger/10 px-3 py-2 text-xs text-danger">
            ⚠ Ya existe una carga con ese número de comprobante en esta estación (carga #
            {duplicado.cargaId}). Verificá que no la estés cargando dos veces.
          </p>
        )}
        {inseguros.size > 0 && (
          <p className="mt-3 rounded-md border border-warn/60 bg-warn/10 px-3 py-2 text-xs text-warn">
            Leímos el ticket dos veces y {inseguros.size === 1 ? 'un dato no coincidió' : `${inseguros.size} datos no coincidieron`}
            {' '}entre las dos lecturas: quedaron vacíos y están marcados abajo. Completalos mirando la foto.
          </p>
        )}
      </Card>

      <Card title="Móvil y kilometraje">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-ink">
            Móvil {sugeridos.has('movilId') && <BadgeSugerido />}
            <select
              aria-label="Móvil"
              value={movilId ?? ''}
              onChange={(e) => {
                movilTocadoRef.current = e.target.value !== '';
                setMovilId(e.target.value ? Number(e.target.value) : null);
                setKmConfirmado(false);
                quitarSugerido('movilId');
              }}
              className={`mt-1 rounded-md border bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${sugeridos.has('movilId') ? 'border-brand' : 'border-line'}`}
            >
              <option value="">—</option>
              {(moviles ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.identificador}
                </option>
              ))}
            </select>
            {patenteSinMatch && (
              <span className="mt-1 text-[11px] text-slate">
                Patente leída: «{patenteSinMatch}» — no está en el maestro de móviles.
              </span>
            )}
            {intentoEnviar && movilId == null && (
              <span className="mt-1 text-[11px] text-danger">Elegí un móvil.</span>
            )}
          </label>

          <label className="flex flex-col text-sm font-medium text-ink">
            Kilometraje {sugeridos.has('km') && <BadgeSugerido />}{inseguros.has('km') && <BadgeRevisar />}
            <input
              aria-label="Kilometraje"
              type="number"
              min="0"
              value={km ?? ''}
              onChange={(e) => {
                kmTocadoRef.current = e.target.value !== '';
                setKm(e.target.value ? Number(e.target.value) : null);
                setKmConfirmado(false);
                quitarSugerido('km');
              }}
              className={`mt-1 rounded-md border bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${sugeridos.has('km') ? 'border-brand' : 'border-line'}`}
            />
            {intentoEnviar && (km == null || km < 0) && (
              <span className="mt-1 text-[11px] text-danger">Ingresá el kilometraje.</span>
            )}
          </label>
        </div>

        {advertencia && (
          <div className="mt-3 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p>{advertencia}</p>
            <label className="mt-1.5 flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={kmConfirmado}
                onChange={(e) => setKmConfirmado(e.target.checked)}
              />
              Confirmo el kilometraje ingresado
            </label>
          </div>
        )}
      </Card>

      <Card title="Datos de la carga">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-ink">
            Fecha {sugeridos.has('fechaCarga') && <BadgeSugerido />}
            <input
              type="date"
              value={fecha}
              onChange={(e) => {
                fechaTocadaRef.current = true;
                setFecha(e.target.value);
                quitarSugerido('fechaCarga');
              }}
              className={`mt-1 rounded-md border bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${sugeridos.has('fechaCarga') ? 'border-brand' : 'border-line'}`}
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-ink">
            Litros {sugeridos.has('litros') && <BadgeSugerido />}{inseguros.has('litros') && <BadgeRevisar />}
            <input
              aria-label="Litros"
              type="number"
              min="0"
              step="0.01"
              value={litros ?? ''}
              onChange={(e) => {
                litrosTocadoRef.current = e.target.value !== '';
                setLitros(e.target.value ? Number(e.target.value) : null);
                quitarSugerido('litros');
                setAdvertenciaCoherencia(null);
              }}
              className={`mt-1 rounded-md border bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${sugeridos.has('litros') ? 'border-brand' : 'border-line'}`}
            />
            {intentoEnviar && (litros == null || litros <= 0) && (
              <span className="mt-1 text-[11px] text-danger">Ingresá los litros cargados.</span>
            )}
          </label>

          <label className="flex flex-col text-sm font-medium text-ink">
            Monto {sugeridos.has('monto') && <BadgeSugerido />}{inseguros.has('monto') && <BadgeRevisar />}
            <input
              aria-label="Monto"
              type="number"
              min="0"
              step="0.01"
              value={monto ?? ''}
              onChange={(e) => {
                montoTocadoRef.current = e.target.value !== '';
                setMonto(e.target.value ? Number(e.target.value) : null);
                quitarSugerido('monto');
                setAdvertenciaCoherencia(null);
              }}
              className={`mt-1 rounded-md border bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${sugeridos.has('monto') ? 'border-brand' : 'border-line'}`}
            />
            {intentoEnviar && (monto == null || monto <= 0) && (
              <span className="mt-1 text-[11px] text-danger">Ingresá el monto pagado.</span>
            )}
            {advertenciaCoherencia && (
              <span className="mt-1 rounded-md border border-amber-400/60 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                {advertenciaCoherencia}
              </span>
            )}
          </label>

          <label className="flex flex-col text-sm font-medium text-ink">
            {labelComprobante} {sugeridos.has('nroComprobante') && <BadgeSugerido />}{inseguros.has('nroComprobante') && <BadgeRevisar />}
            {confianzaNumero && <ChipConfianza confianza={confianzaNumero} />}
            <input
              aria-label={labelComprobante}
              value={nroComprobante}
              onChange={(e) => {
                nroComprobanteTocadoRef.current = e.target.value !== '';
                setNroComprobante(e.target.value);
                quitarSugerido('nroComprobante');
                setConfianzaNumero(null);
                setLineaOrigenNumero(null);
              }}
              className={`mt-1 rounded-md border bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${sugeridos.has('nroComprobante') ? 'border-brand' : 'border-line'}`}
            />
            {lineaOrigenNumero && (
              <span className="mt-1 text-[11px] text-slate">Leído de: «{lineaOrigenNumero}»</span>
            )}
            {intentoEnviar && nroComprobante.trim() === '' && (
              <span className="mt-1 text-[11px] text-danger">Ingresá el número de comprobante.</span>
            )}
          </label>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-ink">Medio de pago</p>
          <div className="mt-1.5 flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-ink">
              <input
                type="radio"
                name="medioPago"
                checked={medioPago === 'cuenta_corriente'}
                onChange={() => {
                  medioPagoTocadoRef.current = true;
                  setMedioPago('cuenta_corriente');
                }}
              />
              Cuenta corriente
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink">
              <input
                type="radio"
                name="medioPago"
                checked={medioPago === 'caja'}
                onChange={() => {
                  medioPagoTocadoRef.current = true;
                  setMedioPago('caja');
                }}
              />
              Caja
            </label>
          </div>
          {intentoEnviar && medioPago == null && (
            <p className="mt-1 text-[11px] text-danger">Elegí un medio de pago.</p>
          )}
          {contradiccionMedioPago && (
            <p className="mt-1 rounded-md border border-amber-400/60 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
              {contradiccionMedioPago}
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col text-sm font-medium text-ink">
            Estación {sugeridos.has('estacionId') && <BadgeSugerido />}
            <select
              aria-label="Estación de servicio"
              value={estacionId ?? ''}
              onChange={(e) => {
                estacionTocadaRef.current = e.target.value !== '';
                setEstacionId(e.target.value ? Number(e.target.value) : null);
                quitarSugerido('estacionId');
              }}
              className={`mt-1 rounded-md border bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${sugeridos.has('estacionId') ? 'border-brand' : 'border-line'}`}
            >
              <option value="">—</option>
              {(estaciones ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            {cuitSinMatch && (
              <span className="mt-1 text-[11px] text-slate">
                CUIT leído: {fmtCuit(cuitSinMatch)} — no está en el maestro de estaciones.
              </span>
            )}
            {intentoEnviar && estacionId == null && (
              <span className="mt-1 text-[11px] text-danger">Elegí la estación.</span>
            )}
          </label>

          <label className="flex flex-col text-sm font-medium text-ink">
            Tipo de combustible {sugeridos.has('tipoCombustibleId') && <BadgeSugerido />}
            <select
              aria-label="Tipo de combustible"
              value={tipoCombustibleId ?? ''}
              onChange={(e) => {
                tipoCombustibleTocadoRef.current = e.target.value !== '';
                setTipoCombustibleId(e.target.value ? Number(e.target.value) : null);
                quitarSugerido('tipoCombustibleId');
              }}
              className={`mt-1 rounded-md border bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${sugeridos.has('tipoCombustibleId') ? 'border-brand' : 'border-line'}`}
            >
              <option value="">—</option>
              {(tipos ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {tipoSinMatch && (
              <span className="mt-1 text-[11px] text-slate">
                Tipo leído del ticket: «{tipoSinMatch}» — no está en el catálogo. Podés agregarlo como
                alias en Admin → Tipos de combustible.
              </span>
            )}
            {intentoEnviar && tipoCombustibleId == null && (
              <span className="mt-1 text-[11px] text-danger">Elegí el tipo de combustible.</span>
            )}
          </label>

          <label className="flex flex-col text-sm font-medium text-ink">
            Provincia
            <select
              aria-label="Provincia"
              value={provinciaId ?? ''}
              onChange={(e) => setProvinciaId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">—</option>
              {(provincias ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {intentoEnviar && provinciaId == null && (
              <span className="mt-1 text-[11px] text-danger">Elegí la provincia.</span>
            )}
          </label>
        </div>
      </Card>

      <Card title="Contratos y tareas">
        <div className="space-y-3">
          {contratos.map((c) => (
            <ContratoTareas key={c.id} contrato={c} tareaIds={tareaIds} onToggle={toggleTarea} />
          ))}
        </div>
        {intentoEnviar && tareaIds.length === 0 && (
          <p className="mt-2 text-[11px] text-danger">Elegí al menos una tarea.</p>
        )}
      </Card>

      <Card title="Observaciones">
        <textarea
          aria-label="Observaciones"
          rows={3}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end border-t border-line bg-sand/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button variant="primary" disabled={crear.isPending} onClick={intentarEnviar}>
          Guardar carga
        </Button>
      </div>
    </div>
  );
}
