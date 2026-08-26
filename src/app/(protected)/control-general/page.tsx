'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { QuincenaSelect } from '@/features/mis-registros/quincena-select';
import { MultiFiltro } from '@/components/ui/barra-filtros';
import { opcionesFacetadas } from '@/lib/facetado';
import { HorasPorQuincenaChart } from '@/features/control-general/horas-por-quincena-chart';
import { RankingOperarios } from '@/features/control-general/ranking-operarios';
import {
  useResumenOperarios,
  useSinCarga,
  useMisContratos,
  useHistoricoQuincenas,
  useDetalleDiario,
  useControlDiario,
  type OperarioSinCarga,
  type FiltrosPanel,
} from '@/lib/api/panel-general';
import { useProvincias } from '@/lib/api/catalogos';
import { quincenaDeFecha, type Quincena } from '@/lib/quincena';
import {
  ClockIcon,
  UsersIcon,
  TrendIcon,
  ClipboardIcon,
  AlertUserIcon,
  BarsIcon,
  TrophyIcon,
  WarnTriIcon,
  ListIcon,
  ChevronIcon,
} from '@/components/stat-icons';
import { Skeleton, TableSkeleton } from '@/components/skeleton';

function pasaPersona(cuil: string, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(cuil);
}

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Renglón chico y gris con la auditoría de un registro: quién lo cargó y
 * cuándo, y quién lo aprobó/desaprobó y cuándo (si ya se resolvió). No
 * compite visualmente con tareas/observación — es contexto, no lo operativo. */
function AuditoriaRegistro({
  estado,
  cargadoPorNombre,
  cargadoEn,
  aprobadoPorNombre,
  aprobadoEn,
}: {
  estado: string;
  cargadoPorNombre: string;
  cargadoEn: string;
  aprobadoPorNombre: string | null;
  aprobadoEn: string | null;
}) {
  const verbo = estado === 'desaprobado' ? 'Desaprobado' : 'Aprobado';
  return (
    <div className="mt-1 text-[11px] text-slate">
      <span>
        Cargado por {cargadoPorNombre || '—'} · {formatearFechaHora(cargadoEn)}
      </span>
      {aprobadoPorNombre && aprobadoEn && (
        <span className="ml-2">
          · {verbo} por {aprobadoPorNombre} · {formatearFechaHora(aprobadoEn)}
        </span>
      )}
    </div>
  );
}

/** Cuántas filas del detalle diario se muestran por página ("Ver más"). */
const PAGINA_DETALLE = 50;

const ESTILO_ESTADO: Record<string, string> = {
  pendiente: 'text-warn',
  aprobado: 'text-approved',
  desaprobado: 'text-danger',
};

const CHIP_TONO: Record<'warn' | 'danger' | 'neutral', string> = {
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  neutral: 'bg-brand/20 text-brand-deep',
};

function StatTile({
  label,
  value,
  tono,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  /** Colorea el número solo cuando hay algo que atender (value > 0) — un 0 no es una alerta. */
  tono?: 'warn' | 'danger';
  icon: ReactNode;
  onClick?: () => void;
}) {
  const colorValor =
    tono === 'warn' && value > 0
      ? 'text-warn'
      : tono === 'danger' && value > 0
        ? 'text-danger'
        : 'text-ink';
  const contenido = (
    <>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg ${CHIP_TONO[tono ?? 'neutral']}`}>
          {icon}
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      </div>
      <p className={`mt-1.5 text-3xl font-semibold tabular-nums ${colorValor}`}>{value}</p>
    </>
  );
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className="animate-in fade-in-0 slide-in-from-bottom-1 rounded-xl border border-line bg-surface p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-brand/40"
      >
        {contenido}
      </button>
    );
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 rounded-xl border border-line bg-surface p-4 transition duration-300">
      {contenido}
    </div>
  );
}

/** Fila de la zona de revisión (>13hs/día): compacta, expandible al detalle
 * de cada carga del día — tareas y observación completas (acá es el lugar
 * de leerlas, sin truncar). */
/** Un día del Detalle diario: renglón único que se despliega y muestra TODO
 * lo que la persona hizo esa jornada — incluidos los contratos de otros
 * jefes, marcados (decisión 2026-08-19). Mismo formato que la tabla de
 * +13hs, con la observación y el estado adentro para que se lean completos. */
function FragmentoDetalleDiario({
  dia,
  abierto,
  onToggle,
}: {
  dia: import('@/lib/api/panel-general').DiaDetalleDiario;
  abierto: boolean;
  onToggle: () => void;
}) {
  const tieneAjenos = dia.registros.some((r) => !r.esMiContrato);
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-l-2 border-line border-l-transparent text-ink transition last:border-b-0 hover:border-l-brand hover:bg-sand/60"
        title={abierto ? 'Ocultar el detalle del día' : 'Ver qué hizo ese día'}
      >
        <td className="tabular-nums px-4 py-2.5">{dia.fecha}</td>
        <td className="px-4 py-2.5">
          <button
            type="button"
            aria-expanded={abierto}
            className="text-left underline decoration-line hover:text-brand-deep hover:decoration-brand-deep"
          >
            {dia.operarioNombre}
          </button>
        </td>
        <td className="tabular-nums px-4 py-2.5 font-medium">{dia.totalHoras}</td>
        <td className="px-4 py-2.5 text-slate">
          {dia.contratos.join(', ')}
          {tieneAjenos && (
            <span
              className="ml-1.5 rounded-full bg-slate/10 px-1.5 py-0.5 text-[10px] font-medium"
              title="Ese día también cargó horas en contratos de otros jefes. Se muestran para que veas la jornada completa; no podés aprobarlos."
            >
              incluye otros contratos
            </span>
          )}
        </td>
        <td className="px-4 py-2.5 text-slate">
          <span className={`inline-block transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}>
            <ChevronIcon />
          </span>
        </td>
      </tr>
      {abierto && (
        <tr className="border-b border-line bg-sand/60 last:border-0">
          <td colSpan={5} className="px-4 py-3">
            <ul className="space-y-2">
              {dia.registros.map((r) => (
                <li key={r.id} className={`text-sm ${r.esMiContrato ? '' : 'opacity-70'}`}>
                  <span className="font-medium text-ink">{r.contratoCodigo}</span>
                  {!r.esMiContrato && (
                    <span className="ml-1.5 rounded-full bg-slate/10 px-1.5 py-0.5 text-[10px] font-medium text-slate">
                      otro contrato
                    </span>
                  )}
                  <span className="tabular-nums text-ink"> · {r.horas} hs · </span>
                  <span className={`text-xs font-medium ${ESTILO_ESTADO[r.estado] ?? 'text-slate'}`}>
                    {r.estado}
                  </span>
                  {r.estado === 'desaprobado' && (
                    <span className="ml-1 text-xs italic text-slate">(no suma al total)</span>
                  )}
                  <div className="text-slate">
                    {r.tareas.length > 0 ? r.tareas.join(', ') : 'Sin tareas'}
                    {r.observacion && <span className="block italic">“{r.observacion}”</span>}
                  </div>
                  <AuditoriaRegistro
                    estado={r.estado}
                    cargadoPorNombre={r.cargadoPorNombre}
                    cargadoEn={r.cargadoEn}
                    aprobadoPorNombre={r.aprobadoPorNombre}
                    aprobadoEn={r.aprobadoEn}
                  />
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

function FragmentoControlDiario({
  dia,
  abierto,
  onToggle,
}: {
  dia: import('@/lib/api/panel-general').DiaControlDiario;
  abierto: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Toda la fila expande (no solo el nombre) — el onClick va en el <tr>
          y el clic del botón burbujea hasta ahí, así el teclado también anda. */}
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-l-2 border-line border-l-transparent text-ink transition last:border-b-0 hover:border-l-brand hover:bg-sand/60"
        title={abierto ? 'Ocultar el detalle del día' : 'Ver qué hizo ese día'}
      >
        <td className="tabular-nums px-4 py-2.5">{dia.fecha}</td>
        <td className="px-4 py-2.5">
          <button
            type="button"
            aria-expanded={abierto}
            className="text-left underline decoration-line hover:text-brand-deep hover:decoration-brand-deep"
          >
            {dia.operarioNombre}
          </button>
        </td>
        <td className="tabular-nums px-4 py-2.5 font-medium">{dia.totalHoras}</td>
        <td className="px-4 py-2.5 text-slate">{dia.contratos.join(', ')}</td>
        <td className="px-4 py-2.5 text-slate">
          <span className={`inline-block transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}>
            <ChevronIcon />
          </span>
        </td>
      </tr>
      {abierto && (
        <tr className="border-b border-line bg-sand/60 last:border-0">
          <td colSpan={5} className="px-4 py-3">
            <ul className="space-y-2">
              {dia.registros.map((r) => (
                <li key={r.id} className="text-sm">
                  <span className="font-medium text-ink">{r.contratoCodigo}</span>
                  <span className="tabular-nums text-ink"> · {r.horas} hs · </span>
                  <span className={`text-xs font-medium ${ESTILO_ESTADO[r.estado] ?? 'text-slate'}`}>
                    {r.estado}
                  </span>
                  {r.estado === 'desaprobado' && (
                    <span className="ml-1 text-xs italic text-slate">(no suma al total)</span>
                  )}
                  <div className="text-slate">
                    {r.tareas.length > 0 ? r.tareas.join(', ') : 'Sin tareas'}
                    {r.observacion && (
                      <span className="block italic">“{r.observacion}”</span>
                    )}
                  </div>
                  <AuditoriaRegistro
                    estado={r.estado}
                    cargadoPorNombre={r.cargadoPorNombre}
                    cargadoEn={r.cargadoEn}
                    aprobadoPorNombre={r.aprobadoPorNombre}
                    aprobadoEn={r.aprobadoEn}
                  />
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ControlGeneralPage() {
  // Quincena EN CURSO por defecto (pedido 2026-08-14: mismo criterio en toda la app).
  const [quincena, setQuincena] = useState<Quincena>(() => quincenaDeFecha(new Date()));
  const [contratosSel, setContratosSel] = useState<string[]>([]);
  const [provinciasSel, setProvinciasSel] = useState<string[]>([]);
  const [operariosSel, setOperariosSel] = useState<string[]>([]);
  const [sinCargaSel, setSinCargaSel] = useState<string[]>([]);
  const [visiblesDetalle, setVisiblesDetalle] = useState(PAGINA_DETALLE);
  const sinCargaRef = useRef<HTMLDivElement>(null);

  // Filtros server-side compartidos. El resumen recibe solo contrato y
  // provincia: sus filas por operario son la fuente de las OPCIONES del
  // filtro de operario (si también se filtrara por operario en el server,
  // al tildar uno desaparecerían los demás del desplegable) — tiles y
  // ranking se filtran por operario en el cliente. Histórico y detalle sí
  // reciben el filtro completo. Sin carga no recibe ninguno: es una vista
  // compartida entre todos los jefes, no scopeada a contratos.
  const filtrosBase = useMemo<FiltrosPanel>(
    () => ({
      ...(contratosSel.length ? { contratoIds: contratosSel.map(Number) } : {}),
      ...(provinciasSel.length ? { provinciaIds: provinciasSel.map(Number) } : {}),
    }),
    [contratosSel, provinciasSel],
  );
  const filtros = useMemo<FiltrosPanel>(
    () => ({
      ...filtrosBase,
      ...(operariosSel.length ? { operarioCuils: operariosSel } : {}),
    }),
    [filtrosBase, operariosSel],
  );

  const { data: resumen, isLoading: cargandoResumen } = useResumenOperarios(quincena, filtrosBase);
  const { data: sinCarga, isLoading: cargandoSinCarga } = useSinCarga(quincena);
  const { data: misContratos } = useMisContratos();
  const { data: provincias } = useProvincias();
  // El histórico es contexto, no revisión: siempre llega hasta la quincena
  // EN CURSO (hoy), sin importar qué quincena esté seleccionada arriba —
  // si no, agosto desaparecía del gráfico al revisar julio.
  const quincenaActual = useMemo(() => quincenaDeFecha(new Date()), []);
  const { data: historico, isLoading: cargandoHistorico } = useHistoricoQuincenas(quincenaActual, filtros);
  const { data: detalle, isLoading: cargandoDetalle } = useDetalleDiario(quincena, filtros);
  const { data: controlDiario, isLoading: cargandoControl } = useControlDiario(quincena, filtros);
  // Días expandidos de la zona de revisión (clave operarioCuil|fecha).
  const [diasExpandidos, setDiasExpandidos] = useState<Set<string>>(new Set());

  function alternarDia(clave: string) {
    setDiasExpandidos((prev) => {
      const s = new Set(prev);
      if (s.has(clave)) s.delete(clave);
      else s.add(clave);
      return s;
    });
  }

  // Tiles y ranking respetan el filtro de operario (en el cliente, sobre
  // el resumen que ya viene filtrado por contrato/provincia del server).
  const resumenFiltrado = useMemo(
    () => (resumen ?? []).filter((r) => pasaPersona(r.cuil, operariosSel)),
    [resumen, operariosSel],
  );

  function irASinCarga() {
    sinCargaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const opcionesContrato = useMemo(
    () => (misContratos ?? []).map((c) => ({ value: String(c.id), label: `${c.codigo} — ${c.nombre}` })),
    [misContratos],
  );

  const opcionesProvincia = useMemo(
    () => (provincias ?? []).map((p) => ({ value: String(p.id), label: p.nombre })),
    [provincias],
  );

  // Los operarios elegibles son los que tienen carga en la quincena (según
  // contrato/provincia ya aplicados) — mismo criterio que tenía el viejo
  // buscador del resumen.
  const nombrePorCuilResumen = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of resumen ?? []) m.set(r.cuil, r.apellido_nombre);
    return m;
  }, [resumen]);

  const opcionesOperario = useMemo(
    () =>
      opcionesFacetadas(resumen ?? [], (r) => r.cuil, operariosSel, {
        labelDe: (cuil) => nombrePorCuilResumen.get(cuil) ?? cuil,
      }),
    [resumen, operariosSel, nombrePorCuilResumen],
  );

  const nombrePorCuilSinCarga = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of sinCarga ?? []) m.set(e.cuil, e.apellido_nombre);
    return m;
  }, [sinCarga]);

  const opcionesSinCarga = useMemo(
    () =>
      opcionesFacetadas(sinCarga ?? [], (e: OperarioSinCarga) => e.cuil, sinCargaSel, {
        labelDe: (cuil) => nombrePorCuilSinCarga.get(cuil) ?? cuil,
      }),
    [sinCarga, sinCargaSel, nombrePorCuilSinCarga],
  );

  // Quien tenía carga y dejó de reportar de repente es más urgente que quien
  // nunca cargó nada (probablemente recién ingresado, sin contrato asignado
  // todavía) — esos últimos quedan al final.
  const sinCargaFiltrado = useMemo(() => {
    return [...(sinCarga ?? [])]
      .filter((e) => pasaPersona(e.cuil, sinCargaSel))
      .sort((a, b) => {
        if (a.ultimaCarga === b.ultimaCarga) return 0;
        if (a.ultimaCarga === null) return 1;
        if (b.ultimaCarga === null) return -1;
        return b.ultimaCarga.localeCompare(a.ultimaCarga);
      });
  }, [sinCarga, sinCargaSel]);

  const conHorasExtra = resumenFiltrado.filter((r) => r.superaHorasExtra).length;
  const filasPendientes = resumenFiltrado.reduce((s, r) => s + r.pendiente, 0);
  // Réplica del stat tile "Horas Totales" del Looker: pendientes + aprobadas
  // (totalHoras ya excluye rechazadas), redondeado a 1 decimal.
  const horasQuincena = Math.round(resumenFiltrado.reduce((s, r) => s + r.totalHoras, 0) * 10) / 10;

  const detalleVisible = (detalle ?? []).slice(0, visiblesDetalle);

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Jefe de contrato" title="Control general" />
      <QuincenaSelect value={quincena} onChange={setQuincena}>
        <MultiFiltro
          label="Contrato"
          ariaLabel="Filtrar por contrato"
          opciones={opcionesContrato}
          seleccionados={contratosSel}
          onChange={setContratosSel}
        />
        <MultiFiltro
          label="Provincia"
          ariaLabel="Filtrar por provincia"
          opciones={opcionesProvincia}
          seleccionados={provinciasSel}
          onChange={setProvinciasSel}
        />
        <MultiFiltro
          label="Operario"
          ariaLabel="Filtrar por operario"
          opciones={opcionesOperario}
          seleccionados={operariosSel}
          onChange={setOperariosSel}
        />
      </QuincenaSelect>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Horas de la quincena" value={horasQuincena} icon={<ClockIcon />} />
        <StatTile label="Operarios con carga" value={resumenFiltrado.length} icon={<UsersIcon />} />
        <StatTile label="Con horas extra (+88hs)" value={conHorasExtra} tono="warn" icon={<TrendIcon />} />
        <StatTile label="Filas pendientes de revisar" value={filasPendientes} tono="warn" icon={<ClipboardIcon />} />
        <StatTile
          label="Sin carga"
          value={(sinCarga ?? []).length}
          tono="danger"
          icon={<AlertUserIcon />}
          onClick={irASinCarga}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
            <span className="text-brand-deep">
              <BarsIcon />
            </span>
            Horas por quincena
          </h2>
          {cargandoHistorico ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <HorasPorQuincenaChart datos={historico ?? []} />
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
            <span className="text-brand-deep">
              <TrophyIcon />
            </span>
            Ranking — mayor cantidad de horas
          </h2>
          {cargandoResumen ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <RankingOperarios resumen={resumenFiltrado} />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
          <span className="text-warn">
            <WarnTriIcon />
          </span>
          Control — más de 13 hs en un día
        </h2>
        <p className="text-xs text-slate">
          Zona de revisión: jornadas que superan las 13hs sumando todos los contratos (no es la
          alerta de 16hs — esto es para mirar en detalle qué se hizo ese día). Las rechazadas no
          suman al total, pero se muestran al expandir.
        </p>
        {cargandoControl ? (
          <TableSkeleton rows={3} cols={5} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Operario</th>
                  <th className="px-4 py-2.5 font-medium">Total hs</th>
                  <th className="px-4 py-2.5 font-medium">Contratos</th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {(controlDiario ?? []).map((d) => {
                  const clave = `${d.operarioCuil}|${d.fecha}`;
                  const abierto = diasExpandidos.has(clave);
                  return (
                    <FragmentoControlDiario
                      key={clave}
                      dia={d}
                      abierto={abierto}
                      onToggle={() => alternarDia(clave)}
                    />
                  );
                })}
                {(controlDiario ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm text-slate">
                      Ningún operario superó las 13hs en un día esta quincena.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
            <span className="text-brand-deep">
              <ListIcon />
            </span>
            Detalle diario
          </h2>
          {(detalle ?? []).some((d) => d.registros.some((r) => !r.esMiContrato)) && (
            <span className="text-xs text-slate" data-testid="leyenda-jornada-completa">
              Las horas del día incluyen lo que estas personas hicieron en otros contratos:
              abrí el día para ver el detalle completo.
            </span>
          )}
          {(detalle ?? []).length > 0 && (
            <span className="text-xs text-slate">
              mostrando {detalleVisible.length} de {(detalle ?? []).length}
            </span>
          )}
        </div>
        {cargandoDetalle ? (
          <TableSkeleton rows={6} cols={5} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Operario</th>
                  <th className="px-4 py-2.5 font-medium">Horas del día</th>
                  <th className="px-4 py-2.5 font-medium">Contratos</th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {detalleVisible.map((d) => {
                  const clave = `det|${d.operarioCuil}|${d.fecha}`;
                  return (
                    <FragmentoDetalleDiario
                      key={clave}
                      dia={d}
                      abierto={diasExpandidos.has(clave)}
                      onToggle={() => alternarDia(clave)}
                    />
                  );
                })}
                {detalleVisible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-sm text-slate">
                      Sin registros en esta quincena.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {(detalle ?? []).length > visiblesDetalle && (
              <div className="border-t border-line p-2 text-center">
                <button
                  type="button"
                  onClick={() => setVisiblesDetalle((v) => v + PAGINA_DETALLE)}
                  className="rounded-md px-3 py-1 text-xs font-medium text-slate underline transition hover:text-ink"
                >
                  Ver más
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div ref={sinCargaRef} className="space-y-3 scroll-mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
            <span className="text-danger">
              <AlertUserIcon />
            </span>
            Sin carga en esta quincena
          </h2>
          <MultiFiltro
            label="Empleado"
            ariaLabel="Buscar empleado sin carga"
            opciones={opcionesSinCarga}
            seleccionados={sinCargaSel}
            onChange={setSinCargaSel}
          />
        </div>
        <p className="text-xs text-slate">
          Empleados activos sin ningún registro de horas en el período — puede ser una omisión, o
          alguien que trabajó bajo otro contrato. Compartido entre todos los Jefes de Contrato y
          Admin, no está limitado a tus contratos.
        </p>
        {cargandoSinCarga ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-2.5 font-medium">Empleado</th>
                  <th className="px-4 py-2.5 font-medium">Legajo</th>
                  <th className="px-4 py-2.5 font-medium">Cargo</th>
                  <th className="px-4 py-2.5 font-medium">Última carga</th>
                </tr>
              </thead>
              <tbody>
                {sinCargaFiltrado.map((e) => (
                  <tr key={e.cuil} className="border-b border-line text-ink last:border-0">
                    <td className="px-4 py-2.5">{e.apellido_nombre}</td>
                    <td className="px-4 py-2.5">{e.legajo}</td>
                    <td className="px-4 py-2.5">{e.cargo}</td>
                    <td className="px-4 py-2.5">
                      {e.ultimaCarga ?? (
                        <span className="text-xs italic text-slate">Nunca</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sinCargaFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm text-slate">
                      {(sinCarga ?? []).length === 0
                        ? 'Todos los empleados activos tienen carga en esta quincena.'
                        : 'Sin empleados que coincidan con la búsqueda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
