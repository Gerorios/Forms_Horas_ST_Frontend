import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cloneElement, type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type {
  EvolucionMensualPunto,
  PorContratoMesPunto,
  PorProvinciaPunto,
  TopItemPunto,
  InteranualResponse,
  EstadoCargaContrato,
} from '@/lib/api/certificaciones';
import { armarMatrizOperativa } from './estado-operativo';

// jsdom no mide el layout: ResponsiveContainer quedaría en 0×0 y Recharts no
// dibujaría nada (mismo patrón que analisis-charts.test.tsx).
vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('recharts')>();
  return {
    ...orig,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 400 } as object),
  };
});

const useContratosAnalytics = vi.fn();
const useProvinciasAnalytics = vi.fn();
const useEvolucionMensual = vi.fn();
const usePorContratoMes = vi.fn();
const usePorProvincia = vi.fn();
const useTopItems = vi.fn();
const useInteranual = vi.fn();
const useEstadoCargasCompleto = vi.fn();

vi.mock('@/lib/api/certificaciones', () => ({
  useContratosAnalytics: (...args: unknown[]) => useContratosAnalytics(...args),
  useProvinciasAnalytics: (...args: unknown[]) => useProvinciasAnalytics(...args),
  useEvolucionMensual: (...args: unknown[]) => useEvolucionMensual(...args),
  usePorContratoMes: (...args: unknown[]) => usePorContratoMes(...args),
  usePorProvincia: (...args: unknown[]) => usePorProvincia(...args),
  useTopItems: (...args: unknown[]) => useTopItems(...args),
  useInteranual: (...args: unknown[]) => useInteranual(...args),
  useEstadoCargasCompleto: (...args: unknown[]) => useEstadoCargasCompleto(...args),
}));

const useSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  useSession: (...args: unknown[]) => useSession(...args),
}));

import AnalyticsPage from '@/app/(protected)/certificaciones/analytics/page';

const evolucion: EvolucionMensualPunto[] = [
  { periodo: '2026-07', monto_total: 1_000_000, pgn_total: 500 },
  { periodo: '2026-08', monto_total: 1_200_000, pgn_total: 600 },
];

const porContratoMes: PorContratoMesPunto[] = [
  { periodo: '2026-07', contrato: 'K5', monto_total: 600_000, pgn_total: 300 },
  { periodo: '2026-07', contrato: 'K6', monto_total: 400_000, pgn_total: 200 },
  { periodo: '2026-08', contrato: 'K5', monto_total: 700_000, pgn_total: 350 },
  { periodo: '2026-08', contrato: 'K6', monto_total: 500_000, pgn_total: 250 },
];

const porProvincia: PorProvinciaPunto[] = [
  { provincia: 'Salta', monto_total: 1_500_000, pgn_total: 700, lineas: 12 },
  { provincia: 'Jujuy', monto_total: 700_000, pgn_total: 400, lineas: 6 },
];

const topItems: TopItemPunto[] = [
  { item_codigo: 'IT-1', tarea: 'Excavación', contrato: 'K5', monto_total: 900_000, pgn_total: 300 },
  { item_codigo: 'IT-2', tarea: 'Soldadura', contrato: 'K6', monto_total: 300_000, pgn_total: 100 },
];

const interanual: InteranualResponse = {
  anio_actual: 2026,
  anio_anterior: 2025,
  meses: [
    { mes: 7, monto_actual: 1_000_000, monto_anterior: 800_000, pgn_actual: 500, pgn_anterior: 400, var_monto: 25, var_pgn: 25 },
    { mes: 8, monto_actual: 1_200_000, monto_anterior: 1_000_000, pgn_actual: 600, pgn_anterior: 500, var_monto: 20, var_pgn: 20 },
  ],
};

const estadoCargas: EstadoCargaContrato[] = [
  { contrato: 'K5', periodo: '2026-07', cargado: true, usuario: 'ana', cargado_en: '2026-07-05', filas_cargadas: 10, estado: 'ok' },
  { contrato: 'K6', periodo: '2026-07', cargado: false, usuario: null, cargado_en: null, filas_cargadas: null, estado: 'pendiente' },
  { contrato: 'K5', periodo: '2026-08', cargado: true, usuario: 'ana', cargado_en: '2026-08-04', filas_cargadas: 12, estado: 'ok' },
  { contrato: 'K6', periodo: '2026-08', cargado: true, usuario: 'luis', cargado_en: '2026-08-06', filas_cargadas: 9, estado: 'ok' },
];

function ok<T>(data: T) {
  return { data, isLoading: false, isError: false };
}

beforeEach(() => {
  useContratosAnalytics.mockReturnValue(ok(['K5', 'K6']));
  useProvinciasAnalytics.mockReturnValue(ok(['Salta', 'Jujuy']));
  useEvolucionMensual.mockReturnValue(ok(evolucion));
  usePorContratoMes.mockReturnValue(ok(porContratoMes));
  usePorProvincia.mockReturnValue(ok(porProvincia));
  useTopItems.mockReturnValue(ok(topItems));
  useInteranual.mockReturnValue(ok(interanual));
  useEstadoCargasCompleto.mockReturnValue(ok(estadoCargas));
  useSession.mockReturnValue({ perfil: { cert: { nivel: 'admin', ks: [], inc: false } } });
});

describe('AnalyticsPage', () => {
  it('renderiza las 4 secciones exigidas por el brief con sus aria-label', () => {
    render(<AnalyticsPage />);
    expect(screen.getByRole('region', { name: 'Evolución mensual' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Por contrato' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Desagregado' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Operativo' })).toBeInTheDocument();
  });

  it('renderiza también el Resumen del período, en el orden Resumen/Tendencia/Desagregado/Operativo', () => {
    render(<AnalyticsPage />);
    const regiones = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(regiones).toEqual([
      'Resumen del período',
      'Evolución mensual',
      'Por contrato',
      'Comparación interanual',
      'Desagregado',
      'Operativo',
    ]);
  });

  it('el resumen del período totaliza monto y PGN de la evolución mensual', () => {
    render(<AnalyticsPage />);
    // 1.000.000 + 1.200.000 = 2.200.000
    expect(screen.getByText(/2\.200\.000/)).toBeInTheDocument();
    // 500 + 600 PGN
    expect(screen.getByText('1.100')).toBeInTheDocument();
  });

  it('la barra de filtros ofrece los contratos y provincias disponibles', () => {
    render(<AnalyticsPage />);
    expect(screen.getByLabelText('Filtrar por contrato')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por provincia')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por tipo')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha hasta')).toBeInTheDocument();
  });

  it('la tabla de top ítems muestra los ítems recibidos', async () => {
    render(<AnalyticsPage />);
    // Los charts se cargan con next/dynamic({ ssr: false }) — se resuelven
    // en un microtask posterior al render, de ahí el findBy* (con retry).
    const tabla = await screen.findByRole('table', { name: /top ítems/i });
    expect(tabla).toBeInTheDocument();
    expect(screen.getByText('IT-1')).toBeInTheDocument();
    expect(screen.getByText('Excavación')).toBeInTheDocument();
  });

  it('la tabla de top ítems muestra el código como chip, la tarea con title y el monto formateado', async () => {
    render(<AnalyticsPage />);
    await screen.findByRole('table', { name: /top ítems/i });

    const chip = screen.getByText('IT-1');
    expect(chip.tagName).toBe('SPAN');

    const tarea = screen.getByText('Excavación');
    expect(tarea).toHaveAttribute('title', 'Excavación');

    // `fmtMoneda` intercala un nbsp entre "$" y el monto — se matchea con
    // regex para no depender de qué carácter de espacio normaliza jsdom.
    expect(screen.getByText(/\$\s?900\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s?300\.000/)).toBeInTheDocument();
  });

  it('la torta por provincia renderiza un donut con aria-label y % por provincia', async () => {
    render(<AnalyticsPage />);
    const torta = await screen.findByRole(
      'img',
      { name: 'Distribución del certificado por provincia' },
      { timeout: 3000 },
    );
    expect(torta).toBeInTheDocument();
    // Salta: 1.500.000 / 2.200.000 = 68,2 %; Jujuy: 700.000 / 2.200.000 = 31,8 %
    expect(screen.getByText(/68,2\s?%/)).toBeInTheDocument();
    expect(screen.getByText(/31,8\s?%/)).toBeInTheDocument();
  });

  it('sin datos de evolución mensual muestra el vacío accesible dentro de la sección', async () => {
    useEvolucionMensual.mockReturnValue(ok([]));
    render(<AnalyticsPage />);
    expect(await screen.findByText('Sin datos para el período filtrado.')).toBeInTheDocument();
  });

  it('la sección Comparación interanual avisa que no aplica el filtro de fechas', () => {
    render(<AnalyticsPage />);
    expect(
      screen.getByText('Compara año completo actual vs anterior — no aplica el filtro de fechas.'),
    ).toBeInTheDocument();
  });

  it('nivel "carga": no renderiza la sección Operativo ni dispara la query de estado-cargas', () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'carga', ks: [], inc: false } } });
    // `/analytics/estado-cargas` exige gerente/admin — el mock simula que el
    // hook está deshabilitado (mismo comportamiento que TanStack Query con
    // `enabled: false`: sin data, sin loading, sin error).
    useEstadoCargasCompleto.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    render(<AnalyticsPage />);

    expect(screen.queryByRole('region', { name: 'Operativo' })).not.toBeInTheDocument();
    // Las otras 3 secciones exigidas siguen presentes — el gate es puntual.
    expect(screen.getByRole('region', { name: 'Evolución mensual' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Por contrato' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Desagregado' })).toBeInTheDocument();

    expect(useEstadoCargasCompleto.mock.calls.at(-1)?.[0]).toBe(false);
  });

  it('nivel distinto de "carga" (ej. admin): sí renderiza Operativo y habilita la query', () => {
    useSession.mockReturnValue({ perfil: { cert: { nivel: 'lectura', ks: [], inc: false } } });
    render(<AnalyticsPage />);
    expect(screen.getByRole('region', { name: 'Operativo' })).toBeInTheDocument();
    expect(useEstadoCargasCompleto.mock.calls.at(-1)?.[0]).toBe(true);
  });
});

describe('armarMatrizOperativa', () => {
  it('arma contratos y períodos ordenados con la celda correcta por clave', () => {
    const matriz = armarMatrizOperativa(estadoCargas);
    expect(matriz.contratos).toEqual(['K5', 'K6']);
    expect(matriz.periodos).toEqual(['2026-07', '2026-08']);
    expect(matriz.celdas.get('K5__2026-07')?.cargado).toBe(true);
    expect(matriz.celdas.get('K6__2026-07')?.cargado).toBe(false);
    expect(matriz.celdas.get('K5__2026-08')?.usuario).toBe('ana');
  });

  it('sin registro para una combinación contrato/período, la celda queda undefined (no "falta" falso)', () => {
    const matriz = armarMatrizOperativa([estadoCargas[0]]); // solo K5/2026-07
    expect(matriz.celdas.get('K6__2026-07')).toBeUndefined();
  });

  it('recorta a los últimos 12 períodos cuando hay más', () => {
    const muchos: EstadoCargaContrato[] = Array.from({ length: 15 }, (_, i) => ({
      contrato: 'K5',
      periodo: `2025-${String(i + 1).padStart(2, '0')}`,
      cargado: true,
      usuario: 'ana',
      cargado_en: '2025-01-01',
      filas_cargadas: 1,
      estado: 'ok',
    }));
    const matriz = armarMatrizOperativa(muchos);
    expect(matriz.periodos).toHaveLength(12);
    expect(matriz.periodos[0]).toBe('2025-04'); // se descartan los 3 más viejos
    expect(matriz.periodos.at(-1)).toBe('2025-15');
  });
});
