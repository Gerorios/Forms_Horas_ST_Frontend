import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cloneElement, type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type {
  FilaResumenCert,
  EstadoCargaContrato,
  PresupuestoContrato,
  PorContratoMesPunto,
  IncidenciaMesSerie,
} from '@/lib/api/certificaciones';

// jsdom no mide layout: ResponsiveContainer quedaría en 0×0 (mismo patrón
// que analytics-page.test.tsx / analisis-page.test.tsx).
vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('recharts')>();
  return {
    ...orig,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 400 } as object),
  };
});

const useResumenCert = vi.fn();
const useEstadoCargas = vi.fn();
const usePresupuesto = vi.fn();
const usePorContratoMes = vi.fn();
const useIncidenciaSerie = vi.fn();

vi.mock('@/lib/api/certificaciones', () => ({
  useResumenCert: (...args: unknown[]) => useResumenCert(...args),
  useEstadoCargas: (...args: unknown[]) => useEstadoCargas(...args),
  usePresupuesto: (...args: unknown[]) => usePresupuesto(...args),
  usePorContratoMes: (...args: unknown[]) => usePorContratoMes(...args),
  useIncidenciaSerie: (...args: unknown[]) => useIncidenciaSerie(...args),
}));

const useSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  useSession: (...args: unknown[]) => useSession(...args),
}));

import CertificacionesPage from '@/app/(protected)/certificaciones/page';

const resumenActual: FilaResumenCert[] = [
  { periodo: '2026-08', contrato: 'K5', tipo: 'Materiales', lineas: 5, monto_total: 700_000 },
  { periodo: '2026-08', contrato: 'K6', tipo: 'Mano de obra', lineas: 3, monto_total: 500_000 },
];
const resumenAnterior: FilaResumenCert[] = [
  { periodo: '2026-07', contrato: 'K5', tipo: 'Materiales', lineas: 4, monto_total: 600_000 },
];

const estadoCargas: EstadoCargaContrato[] = [
  { contrato: 'K5', periodo: '2026-08', cargado: true, usuario: 'ana', cargado_en: '2026-08-04', filas_cargadas: 12, estado: 'ok' },
  { contrato: 'K6', periodo: '2026-08', cargado: false, usuario: null, cargado_en: null, filas_cargadas: null, estado: 'pendiente' },
];

const presupuesto: PresupuestoContrato[] = [
  { contrato: 'K5', descripcion: 'Contrato K5', periodo_desde: '2026-01', periodo_hasta: '2026-12', monto_presupuesto: 10_000_000, consumido: 4_000_000, pct: 40 },
];

const porContratoMes: PorContratoMesPunto[] = [
  { periodo: '2026-07', contrato: 'K5', monto_total: 600_000, pgn_total: 300 },
  { periodo: '2026-08', contrato: 'K5', monto_total: 700_000, pgn_total: 350 },
  { periodo: '2026-08', contrato: 'K6', monto_total: 500_000, pgn_total: 250 },
];

const incidenciaSerie: IncidenciaMesSerie[] = [
  { anio: 2026, mes: 7, contratos: [{ codigo: 'K5', montoMo: 180_000 }], sinAsignar: null },
  { anio: 2026, mes: 8, contratos: [{ codigo: 'K5', montoMo: 210_000 }, { codigo: 'K6', montoMo: 150_000 }], sinAsignar: 5_000 },
];

function ok<T>(data: T) {
  return { data, isLoading: false, isError: false };
}

beforeEach(() => {
  // Fija "hoy" en agosto 2026, mismo mes de las fixtures — la página arranca
  // filtrada en el mes actual (mismo patrón que seccion-bono.test.tsx).
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 15));

  useResumenCert.mockImplementation((periodo: string) =>
    periodo === '2026-08' ? ok(resumenActual) : periodo === '2026-07' ? ok(resumenAnterior) : ok([]),
  );
  useEstadoCargas.mockReturnValue(ok(estadoCargas));
  usePresupuesto.mockReturnValue(ok(presupuesto));
  usePorContratoMes.mockReturnValue(ok(porContratoMes));
  useIncidenciaSerie.mockReturnValue(ok(incidenciaSerie));
  useSession.mockReturnValue({ perfil: { cert: { nivel: 'admin', ks: [], inc: false } } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CertificacionesPage — Resumen', () => {
  it('muestra los 3 KPIs (certificado del mes, certificados X/Y, aún sin subir)', () => {
    render(<CertificacionesPage />);

    expect(screen.getByText('Certificado del mes')).toBeInTheDocument();
    // 700.000 + 500.000 = 1.200.000
    expect(screen.getByText(/1\.200\.000/)).toBeInTheDocument();

    expect(screen.getByText('Contratos certificados')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    expect(screen.getByText('Aún sin subir')).toBeInTheDocument();
  });

  it('el delta del certificado del mes compara contra el mes anterior', () => {
    render(<CertificacionesPage />);
    // (1.200.000 - 600.000) / 600.000 = 100% — sube, texto con flecha ▲
    expect(screen.getByText(/▲.*100,0\s*%/)).toBeInTheDocument();
  });

  it('elimina la tabla de detalle por contrato y tipo', () => {
    render(<CertificacionesPage />);
    expect(screen.queryByText('Detalle por contrato y tipo')).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /detalle de certificaciones por contrato/i })).not.toBeInTheDocument();
  });

  it('renderiza la sección de incidencia con el gráfico de evolución de 12 meses', async () => {
    render(<CertificacionesPage />);
    expect(await screen.findByRole('img', { name: 'Evolución mensual de la incidencia de MO' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /incidencia de mano de obra por contrato/i })).toBeInTheDocument();
  });

  it('nota "sin asignar" cuando el último punto de la serie trae sinAsignar', async () => {
    render(<CertificacionesPage />);
    expect(await screen.findByText(/Sin contrato asignable/)).toBeInTheDocument();
  });

  it('sin nota "sin asignar" cuando el último punto trae sinAsignar null', async () => {
    useIncidenciaSerie.mockReturnValue(
      ok([{ anio: 2026, mes: 8, contratos: [{ codigo: 'K5', montoMo: 210_000 }], sinAsignar: null }]),
    );
    render(<CertificacionesPage />);
    await screen.findByRole('img', { name: 'Evolución mensual de la incidencia de MO' });
    expect(screen.queryByText(/Sin contrato asignable/)).not.toBeInTheDocument();
  });

  it('nivel "carga" sin claim inc: no muestra la sección de incidencia', () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'carga', ks: ['K5'], inc: false } } });
    render(<CertificacionesPage />);
    expect(screen.queryByRole('table', { name: /incidencia de mano de obra por contrato/i })).not.toBeInTheDocument();
    expect(useIncidenciaSerie.mock.calls.at(-1)?.[2]).toBe(false);
  });

  it('nivel "carga": el gate de estado-cargas fue eliminado — la query se dispara igual y muestra los KPIs', () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'carga', ks: ['K5'], inc: false } } });
    render(<CertificacionesPage />);
    expect(screen.getByText('Contratos certificados')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    // Un solo argumento (el período) — ya no recibe el flag `habilitado`.
    expect(useEstadoCargas.mock.calls.at(-1)).toEqual(['2026-08']);
  });
});
