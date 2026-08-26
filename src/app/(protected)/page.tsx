'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth/session';
import { navForRole } from '@/components/layout/nav';
import { PageHeader } from '@/components/page-header';
import { useResumenOperarios, useSinCarga } from '@/lib/api/panel-general';
import { useNovedades } from '@/lib/api/novedades';
import { useAlertasQuincena } from '@/lib/api/liquidacion';
import { useMisRegistros } from '@/lib/api/registros';
import { quincenaDeFecha, rangoQuincenaISO, diasParaCierreQuincena } from '@/lib/quincena';
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
  '/km-por-tantos': 'Cargar los km relevados de cada quincena para el personal "por tantos".',
};

type Tono = 'warn' | 'danger' | 'neutral';

const TONO_BG: Record<Tono, string> = {
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  neutral: 'bg-brand/20 text-brand-deep',
};

interface DatoIndicador {
  label: string;
  valor: string | number;
  tono: Tono;
  icon: ReactNode;
  href?: string;
}

/** Tile clickeable (si trae href) con el mismo dato que ya se calcula en el
 * módulo correspondiente — nada de backend nuevo, solo se trae acá y se hace
 * accesible de un vistazo desde el Inicio. */
function Indicador({ label, valor, tono, icon, href }: DatoIndicador) {
  const clases =
    'group flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-sm transition ' +
    (href ? 'hover:-translate-y-0.5 hover:border-brand' : '');
  const contenido = (
    <>
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${TONO_BG[tono]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-ink">{valor}</p>
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={clases}>
        {contenido}
      </Link>
    );
  }
  return <div className={clases}>{contenido}</div>;
}

function FilaIndicadores({ datos }: { datos: DatoIndicador[] }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {datos.map((d) => (
        <Indicador key={d.label} {...d} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { perfil } = useSession();
  const rol = perfil?.rol.nombre;
  const cuil = perfil?.cuil ?? '';

  const periodo = useMemo(() => quincenaDeFecha(new Date()), []);
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

  const items = navForRole(perfil);
  const nombre = perfil.empleado.apellido_nombre;

  const cierreItem: DatoIndicador = {
    label: 'Cierre de quincena',
    valor: diasCierre === 0 ? 'Hoy' : `${diasCierre} día${diasCierre === 1 ? '' : 's'}`,
    tono: 'neutral',
    icon: <CalendarIcon />,
  };

  let indicadores: DatoIndicador[] = [];
  if (rol === 'JefeContrato') {
    const pendientes = (resumen ?? []).reduce((s, r) => s + r.pendiente, 0);
    const conHorasExtra = (resumen ?? []).filter((r) => r.superaHorasExtra).length;
    indicadores = [
      { label: 'Pendientes de aprobar', valor: pendientes, tono: 'warn', icon: <ClipboardIcon />, href: '/aprobaciones' },
      { label: 'Sin carga', valor: (sinCarga ?? []).length, tono: 'danger', icon: <AlertUserIcon />, href: '/control-general' },
      { label: 'Con horas extra', valor: conHorasExtra, tono: 'warn', icon: <TrendIcon />, href: '/control-general' },
      cierreItem,
    ];
  } else if (rol === 'HyS') {
    const pendientes = (ausencias ?? []).filter(
      (n) => n.tipoNovedad.nombre === 'Ausencia' && n.estado === 'activa' && n.estadoHys === 'pendiente',
    ).length;
    indicadores = [
      { label: 'Ausencias pendientes', valor: pendientes, tono: 'warn', icon: <BellIcon />, href: '/ausencias' },
      cierreItem,
    ];
  } else if (rol === 'Liquidador') {
    indicadores = [
      {
        label: 'Perfiles incompletos',
        valor: (alertas?.perfilIncompleto ?? []).length,
        tono: 'danger',
        icon: <WarnTriIcon />,
        href: '/liquidacion',
      },
      {
        label: 'Sin horas aprobadas',
        valor: (alertas?.sinHorasAprobadas ?? []).length,
        tono: 'warn',
        icon: <AlertUserIcon />,
        href: '/liquidacion',
      },
      cierreItem,
    ];
  } else if (rol === 'Operario' || rol === 'JefeCuadrilla') {
    const horas = (misRegistros ?? []).reduce((s, r) => (r.estado !== 'desaprobado' ? s + Number(r.horas) : s), 0);
    const pendientes = (misRegistros ?? []).filter((r) => r.estado === 'pendiente').length;
    indicadores = [
      { label: 'Horas cargadas', valor: Math.round(horas * 10) / 10, tono: 'neutral', icon: <ClockIcon />, href: '/mis-registros' },
      { label: 'Pendientes de aprobación', valor: pendientes, tono: 'warn', icon: <ClipboardIcon />, href: '/mis-registros' },
      cierreItem,
    ];
  }

  return (
    <section className="space-y-6">
      <PageHeader title={`Hola, ${nombre}`} />

      {indicadores.length > 0 && <FilaIndicadores datos={indicadores} />}

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
  );
}
