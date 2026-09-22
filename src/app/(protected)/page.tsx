'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth/session';
import { navPorArea } from '@/components/layout/nav';
import { FondoFoto } from '@/components/layout/fondo-foto';
import { FOTOS } from '@/lib/fotos';
import { StatTile, type StatTone } from '@/components/stat-tile';
import { nombreQuincena } from '@/features/liquidacion/formato';
import { useResumenOperarios, useSinCarga } from '@/lib/api/panel-general';
import { useNovedades } from '@/lib/api/novedades';
import { useAlertasQuincena } from '@/lib/api/liquidacion';
import { useMisRegistros } from '@/lib/api/registros';
import { quincenaDeFecha, rangoQuincenaISO, diasParaCierreQuincena } from '@/lib/quincena';
import { redondearHoras } from '@/lib/horas';
import { ClockIcon, ClipboardIcon, AlertUserIcon, TrendIcon, CalendarIcon, BellIcon, WarnTriIcon } from '@/components/stat-icons';

const DESCRIPCION: Record<string, string> = {
  '/reporte': 'Cargar las horas trabajadas del día por operario, tarea y contrato.',
  '/mis-registros': 'Consultar tus horas registradas, por quincena.',
  '/combustible': 'Registrar y consultar cargas de combustible con foto del ticket. Módulo en construcción.',
  '/aprobaciones': 'Revisar y aprobar las horas pendientes de tus contratos.',
  '/control-general': 'Tablero de la quincena: horas totales, histórico, ranking, detalle diario y empleados sin carga.',
  '/novedades': 'Cargar y ver novedades: ausencias, accidentes, francos.',
  '/ausencias': 'Aprobar o rechazar las ausencias que requieren Higiene y Seguridad.',
  '/admin': 'Administrar catálogos, usuarios y contratos.',
  '/liquidacion': 'Total a cobrar por empleado y quincena: horas, categoría, extras y plus.',
  '/certificaciones':
    'Cargar y seguir las certificaciones por contrato: resumen, analytics, ítems e historial.',
  '/km-por-tantos': 'Cargar los km relevados de cada quincena para el personal "por tantos".',
};

/** Un tile del inicio: el mismo dato que ya se calcula en su módulo — nada de
 * backend nuevo, solo se trae acá y se hace accesible de un vistazo. */
interface DatoIndicador {
  label: string;
  /** Línea chica bajo el valor (p. ej. qué estados incluye la suma). */
  sub?: string;
  value: string | number;
  tone: StatTone;
  icon: ReactNode;
  href?: string;
}

function FilaIndicadores({ datos }: { datos: DatoIndicador[] }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {datos.map((d) => (
        // Como en control general: un 0 no es una alerta, se muestra en tinta.
        <StatTile key={d.label} {...d} colorearSoloSiPositivo />
      ))}
    </div>
  );
}

/** Alto de la franja fotográfica (ADR-025): una banda, no un hero. Va en el
 * contenedor y en el bloque de texto, que se apoya abajo a la izquierda. */
const ALTO_FRANJA = 'min-h-[150px] sm:min-h-[190px] lg:min-h-[210px]';

/** "Lunes 21 de septiembre" — Intl la devuelve en minúscula en es-AR. */
function fechaLarga(hoy: Date): string {
  const texto = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(hoy);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function HomePage() {
  const { perfil } = useSession();
  const rol = perfil?.rol.nombre;
  const cuil = perfil?.cuil ?? '';

  const periodo = useMemo(() => quincenaDeFecha(new Date()), []);
  const hoyTexto = useMemo(() => fechaLarga(new Date()), []);
  const rangoISO = useMemo(() => rangoQuincenaISO(periodo), [periodo]);
  const diasCierre = useMemo(() => diasParaCierreQuincena(periodo), [periodo]);

  // Cada hook se habilita solo para el rol que lo necesita — evita pegarle a
  // endpoints restringidos (ej. resumen-operarios es JefeContrato/Admin) o
  // pedir datos que ese rol no va a usar.
  const { data: resumen } = useResumenOperarios(periodo, {}, rol === 'JefeContrato');
  const { data: sinCarga } = useSinCarga(periodo, rol === 'JefeContrato');
  const { data: ausencias } = useNovedades(periodo, undefined, rol === 'HyS');
  const { data: alertas } = useAlertasQuincena(periodo.anio, periodo.mes, periodo.parte, rol === 'Liquidador');
  const { data: misRegistros } = useMisRegistros(cuil, rangoISO, rol === 'Operario' || rol === 'JefeCuadrilla');

  if (!perfil) return null;

  const areas = navPorArea(perfil);
  const nombre = perfil.empleado.apellido_nombre;

  const cierreItem: DatoIndicador = {
    label: 'Cierre de quincena',
    value: diasCierre === 0 ? 'Hoy' : `${diasCierre} día${diasCierre === 1 ? '' : 's'}`,
    tone: 'neutral',
    icon: <CalendarIcon />,
  };

  let indicadores: DatoIndicador[] = [];
  if (rol === 'JefeContrato') {
    const pendientes = (resumen ?? []).reduce((s, r) => s + r.pendiente, 0);
    const conHorasExtra = (resumen ?? []).filter((r) => r.superaHorasExtra).length;
    indicadores = [
      { label: 'Pendientes de aprobar', value: pendientes, tone: 'warn', icon: <ClipboardIcon />, href: '/aprobaciones' },
      { label: 'Sin carga', value: (sinCarga ?? []).length, tone: 'danger', icon: <AlertUserIcon />, href: '/control-general' },
      { label: 'Con horas extra', value: conHorasExtra, tone: 'warn', icon: <TrendIcon />, href: '/control-general' },
      cierreItem,
    ];
  } else if (rol === 'HyS') {
    const pendientes = (ausencias ?? []).filter(
      (n) => n.tipoNovedad.nombre === 'Ausencia' && n.estado === 'activa' && n.estadoHys === 'pendiente',
    ).length;
    indicadores = [
      { label: 'Ausencias pendientes', value: pendientes, tone: 'warn', icon: <BellIcon />, href: '/ausencias' },
      cierreItem,
    ];
  } else if (rol === 'Liquidador') {
    indicadores = [
      {
        label: 'Perfiles incompletos',
        value: (alertas?.perfilIncompleto ?? []).length,
        tone: 'danger',
        icon: <WarnTriIcon />,
        href: '/liquidacion',
      },
      {
        label: 'Sin horas aprobadas',
        value: (alertas?.sinHorasAprobadas ?? []).length,
        tone: 'warn',
        icon: <AlertUserIcon />,
        href: '/liquidacion',
      },
      cierreItem,
    ];
  } else if (rol === 'Operario' || rol === 'JefeCuadrilla') {
    const horas = (misRegistros ?? []).reduce((s, r) => (r.estado !== 'desaprobado' ? s + Number(r.horas) : s), 0);
    const pendientes = (misRegistros ?? []).filter((r) => r.estado === 'pendiente').length;
    indicadores = [
      {
        label: 'Horas cargadas',
        value: redondearHoras(horas),
        // Suma todo lo no desaprobado; en Mis registros el operario ve solo lo aprobado.
        sub: 'Incluye pendientes de aprobación',
        tone: 'neutral',
        icon: <ClockIcon />,
        href: '/mis-registros',
      },
      { label: 'Pendientes de aprobación', value: pendientes, tone: 'warn', icon: <ClipboardIcon />, href: '/mis-registros' },
      cierreItem,
    ];
  }

  return (
    <>
      {/* Franja fotográfica a todo el ancho: el inicio va sin contenedor (2.2),
       * así que el ancho y el padding los pone esta página. Sobre la foto el
       * texto es blanco (el velo lo pone `FondoFoto`), nunca `text-slate`. */}
      <FondoFoto src={FOTOS.inicio} alto={ALTO_FRANJA}>
        <div className={`mx-auto flex ${ALTO_FRANJA} max-w-5xl flex-col justify-end px-4 pb-6 sm:px-6`}>
          <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Hola, {nombre}</h1>
          <p className="mt-1.5 text-sm text-white/80">
            {hoyTexto} · {nombreQuincena(periodo.parte, periodo.mes, periodo.anio)} en curso
          </p>
        </div>
      </FondoFoto>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:py-8">
        {indicadores.length > 0 && <FilaIndicadores datos={indicadores} />}

        {areas.map(({ area, items }) => (
          <section key={area.id} className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
              <span aria-hidden className="h-2 w-2 rounded-[2px] bg-brand" />
              {area.label}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-line bg-surface p-5 transition hover:border-brand hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-semibold text-ink">{item.label}</span>
                    <span className="text-slate transition group-hover:translate-x-0.5 group-hover:text-brand-deep">
                      →
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate">{DESCRIPCION[item.href] ?? ''}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
