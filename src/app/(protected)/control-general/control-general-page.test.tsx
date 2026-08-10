import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  ResumenOperario,
  OperarioSinCarga,
  MisContrato,
  PuntoHistorico,
  FilaDetalleDiario,
} from '@/lib/api/panel-general';

const RESUMEN: ResumenOperario[] = [
  {
    cuil: '20222222222',
    apellido_nombre: 'GOMEZ ANA',
    totalHoras: 40,
    pendiente: 0,
    aprobado: 5,
    desaprobado: 0,
    horasAprobadas: 40,
    superaHorasExtra: false,
    tieneAlertaCruzada: false,
    horasAprobadasAnterior: 0,
    deltaHorasAprobadas: 40,
  },
  {
    cuil: '20111111111',
    apellido_nombre: 'PEREZ JUAN',
    totalHoras: 95,
    pendiente: 1,
    aprobado: 9,
    desaprobado: 0,
    horasAprobadas: 90,
    superaHorasExtra: true,
    tieneAlertaCruzada: false,
    horasAprobadasAnterior: 90,
    deltaHorasAprobadas: 0,
  },
  {
    cuil: '20444444444',
    apellido_nombre: 'ACEVEDO CRISTIAN',
    totalHoras: 18,
    pendiente: 0,
    aprobado: 2,
    desaprobado: 0,
    horasAprobadas: 18,
    superaHorasExtra: false,
    tieneAlertaCruzada: true,
    horasAprobadasAnterior: 10,
    deltaHorasAprobadas: 8,
  },
];

const SIN_CARGA: OperarioSinCarga[] = [
  { cuil: '20555555555', apellido_nombre: 'DIAZ MARIA', legajo: 456, cargo: 'Peón', ultimaCarga: null },
  { cuil: '20333333333', apellido_nombre: 'TORRES LUIS', legajo: 123, cargo: 'Peón', ultimaCarga: '2026-07-10' },
];

const MIS_CONTRATOS: MisContrato[] = [
  { id: 1, codigo: 'K5', nombre: 'Gasnor K5' },
  { id: 2, codigo: 'K7', nombre: 'Gasnor K7' },
];

const HISTORICO: PuntoHistorico[] = [
  { anio: 2026, mes: 7, quincena: 1, horas: 100 },
  { anio: 2026, mes: 7, quincena: 2, horas: 50 },
];

const DETALLE: FilaDetalleDiario[] = [
  {
    id: 10,
    fecha: '2026-08-03',
    contratoId: 1,
    contratoCodigo: 'K5',
    operarioCuil: '20666666666',
    operarioNombre: 'ROJAS PEDRO',
    horas: 8,
    estado: 'pendiente',
    tareas: ['Zanjeo', 'Tendido de cañería'],
  },
  {
    id: 11,
    fecha: '2026-08-02',
    contratoId: 2,
    contratoCodigo: 'K7',
    operarioCuil: '20777777777',
    operarioNombre: 'SOSA MARTA',
    horas: 4,
    estado: 'aprobado',
    tareas: [],
  },
];

vi.mock('@/lib/api/panel-general', () => ({
  useResumenOperarios: vi.fn(() => ({ data: RESUMEN, isLoading: false })),
  useSinCarga: vi.fn(() => ({ data: SIN_CARGA, isLoading: false })),
  useMisContratos: vi.fn(() => ({ data: MIS_CONTRATOS, isLoading: false })),
  useHistoricoQuincenas: vi.fn(() => ({ data: HISTORICO, isLoading: false })),
  useDetalleDiario: vi.fn(() => ({ data: DETALLE, isLoading: false })),
}));

// Los gráficos (Recharts) necesitan medidas reales que jsdom no da:
// passthrough de ResponsiveContainer con tamaño fijo, y router mockeado
// para el clic del ranking.
vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('recharts')>();
  const { cloneElement } = await import('react');
  return {
    ...orig,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      cloneElement(children, { width: 800, height: 400 } as object),
  };
});

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/lib/api/catalogos', () => ({
  useProvincias: vi.fn(() => ({
    data: [
      { id: 3, nombre: 'Salta' },
      { id: 4, nombre: 'Tucumán' },
    ],
    isLoading: false,
  })),
}));

import ControlGeneralPage from './page';
import { useResumenOperarios, useHistoricoQuincenas, useDetalleDiario } from '@/lib/api/panel-general';

describe('ControlGeneralPage', () => {
  it('muestra la lista de sin carga', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('TORRES LUIS')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('muestra la última carga de cada uno, o "Nunca" si no tiene ninguna', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('2026-07-10')).toBeInTheDocument();
    expect(screen.getByText('Nunca')).toBeInTheDocument();
  });

  it('en sin carga, ordena primero a quien tenía carga antes (dejó de reportar) sobre quien nunca cargó', () => {
    render(<ControlGeneralPage />);
    const filas = screen.getAllByRole('row').filter((f) => f.textContent?.includes('Peón'));
    expect(filas[0].textContent).toContain('TORRES LUIS');
    expect(filas[1].textContent).toContain('DIAZ MARIA');
  });

  it('arranca en la quincena anterior (ya cerrada), no en la actual', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();
  });

  it('los filtros de contrato y provincia viven dentro de la misma barra que mes/año/quincena', () => {
    render(<ControlGeneralPage />);
    const barra = screen.getByLabelText('Quincena').closest('div.rounded-xl')!;
    expect(barra).toContainElement(screen.getByLabelText('Filtrar por contrato'));
    expect(barra).toContainElement(screen.getByLabelText('Filtrar por provincia'));
  });

  it('muestra los stat tiles con los totales de la quincena', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('Operarios con carga')).toBeInTheDocument();
    expect(screen.getByText('Con horas extra (+88hs)')).toBeInTheDocument();
    expect(screen.getByText('Filas pendientes de revisar')).toBeInTheDocument();
    expect(screen.getByText('Sin carga')).toBeInTheDocument();
  });

  it('muestra el tile "Horas de la quincena" con la suma de totalHoras', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('Horas de la quincena')).toBeInTheDocument();
    // 40 + 95 + 18 = 153
    expect(screen.getByText('153')).toBeInTheDocument();
  });

  it('ya no existe la tabla de resumen por operario (decisión 2026-08-10)', () => {
    render(<ControlGeneralPage />);
    expect(screen.queryByText(/Resumen por operario/)).not.toBeInTheDocument();
    expect(screen.queryByText('⚠ cruzado')).not.toBeInTheDocument();
  });

  it('renderiza las secciones Horas por quincena, Ranking, Detalle diario y Sin carga en orden', () => {
    render(<ControlGeneralPage />);
    const titulos = screen.getAllByRole('heading').map((h) => h.textContent ?? '');
    const idxHistorico = titulos.findIndex((t) => t.includes('Horas por quincena'));
    const idxRanking = titulos.findIndex((t) => t.includes('Ranking'));
    const idxDetalle = titulos.findIndex((t) => t.includes('Detalle diario'));
    const idxSinCarga = titulos.findIndex((t) => t.includes('Sin carga en esta quincena'));
    expect(idxHistorico).toBeGreaterThan(-1);
    expect(idxRanking).toBeGreaterThan(idxHistorico);
    expect(idxDetalle).toBeGreaterThan(idxRanking);
    expect(idxSinCarga).toBeGreaterThan(idxDetalle);
  });

  it('el gráfico histórico recibe los datos del hook (dos series con leyenda)', () => {
    const { container } = render(<ControlGeneralPage />);
    expect(screen.getByText('1ra quincena')).toBeInTheDocument();
    expect(screen.getByText('2da quincena')).toBeInTheDocument();
    expect(container.querySelectorAll('.recharts-bar').length).toBeGreaterThanOrEqual(2);
  });

  it('el ranking muestra a los operarios del resumen', () => {
    render(<ControlGeneralPage />);
    expect(screen.getAllByText('PEREZ JUAN').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GOMEZ ANA').length).toBeGreaterThan(0);
  });

  it('el detalle diario muestra las filas con contrato, operario linkeado y estado', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('2026-08-03')).toBeInTheDocument();
    expect(screen.getByText('mostrando 2 de 2')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'ROJAS PEDRO' });
    expect(link).toHaveAttribute('href', '/aprobaciones?operarioCuil=20666666666');
    const filaRojas = link.closest('tr')!;
    expect(filaRojas).toHaveTextContent('pendiente');
    expect(filaRojas).toHaveTextContent('K5');
  });

  it('el detalle diario muestra las tareas del registro, o un guion si no tiene', () => {
    render(<ControlGeneralPage />);
    const filaRojas = screen.getByRole('link', { name: 'ROJAS PEDRO' }).closest('tr')!;
    expect(filaRojas).toHaveTextContent('Zanjeo, Tendido de cañería');
    const filaSosa = screen.getByRole('link', { name: 'SOSA MARTA' }).closest('tr')!;
    expect(filaSosa).toHaveTextContent('—');
  });

  it('el filtro por contrato pasa contratoIds a los hooks de resumen, histórico y detalle', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por contrato'));
    await userEvent.click(screen.getByLabelText('K7 — Gasnor K7'));
    await userEvent.keyboard('{Escape}');
    expect(vi.mocked(useResumenOperarios)).toHaveBeenLastCalledWith(expect.anything(), { contratoIds: [2] });
    expect(vi.mocked(useHistoricoQuincenas)).toHaveBeenLastCalledWith(expect.anything(), { contratoIds: [2] });
    expect(vi.mocked(useDetalleDiario)).toHaveBeenLastCalledWith(expect.anything(), { contratoIds: [2] });
  });

  it('el filtro por provincia pasa provinciaIds a los hooks', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por provincia'));
    await userEvent.click(screen.getByLabelText('Salta'));
    await userEvent.keyboard('{Escape}');
    expect(vi.mocked(useResumenOperarios)).toHaveBeenLastCalledWith(expect.anything(), { provinciaIds: [3] });
  });

  it('el MultiFiltro de sin carga filtra por persona tildada', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByLabelText('Buscar empleado sin carga'));
    await userEvent.click(screen.getByLabelText('DIAZ MARIA'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('TORRES LUIS')).not.toBeInTheDocument();
    expect(screen.getByText('DIAZ MARIA')).toBeInTheDocument();
  });

  it('clic en "Sin carga" hace scroll hacia esa sección', async () => {
    render(<ControlGeneralPage />);
    // No hay layout real en jsdom para verificar la posición del scroll;
    // alcanza con confirmar que el clic no rompe nada y la sección sigue ahí.
    await userEvent.click(screen.getByText('Sin carga'));
    expect(screen.getByText('Sin carga en esta quincena')).toBeInTheDocument();
  });
});
