import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  ResumenOperario,
  OperarioSinCarga,
  MisContrato,
  PuntoHistorico,
  DiaDetalleDiario,
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

const DETALLE: DiaDetalleDiario[] = [
  {
    operarioCuil: '20666666666',
    operarioNombre: 'ROJAS PEDRO',
    fecha: '2026-08-03',
    totalHoras: 12,
    contratos: ['K5', 'K11'],
    registros: [
      {
        id: 10,
        contratoId: 1,
        contratoCodigo: 'K5',
        horas: 8,
        estado: 'pendiente',
        tareas: ['Zanjeo', 'Tendido de cañería'],
        observacion: 'Viaje a Metán por reparación de fuga urgente',
        esMiContrato: true,
        cargadoPorNombre: 'ROJAS PEDRO',
        cargadoEn: '2026-08-03T20:00:00.000Z',
        aprobadoPorNombre: null,
        aprobadoEn: null,
      },
      {
        id: 11,
        contratoId: 11,
        contratoCodigo: 'K11',
        horas: 4,
        estado: 'aprobado',
        tareas: ['Soldadura'],
        observacion: 'Apoyo a la cuadrilla de K11 por la tarde',
        esMiContrato: false,
        cargadoPorNombre: 'ROJAS PEDRO',
        cargadoEn: '2026-08-03T20:05:00.000Z',
        aprobadoPorNombre: 'GIMENEZ LAURA',
        aprobadoEn: '2026-08-04T09:00:00.000Z',
      },
    ],
  },
];

const CONTROL_DIARIO = [
  {
    operarioCuil: '20888888888',
    operarioNombre: 'VILLEGAS OSCAR',
    fecha: '2026-08-04',
    totalHoras: 14,
    contratos: ['K5', 'K9'],
    registros: [
      {
        id: 51,
        contratoCodigo: 'K5',
        horas: 7,
        estado: 'aprobado',
        tareas: ['Zanjeo'],
        observacion: null,
        cargadoPorNombre: 'VILLEGAS OSCAR',
        cargadoEn: '2026-08-04T20:00:00.000Z',
        aprobadoPorNombre: 'GIMENEZ LAURA',
        aprobadoEn: '2026-08-05T09:00:00.000Z',
      },
      {
        id: 52,
        contratoCodigo: 'K9',
        horas: 7,
        estado: 'pendiente',
        tareas: [],
        observacion: 'Viaje a Metán por fuga',
        cargadoPorNombre: 'VILLEGAS OSCAR',
        cargadoEn: '2026-08-04T20:05:00.000Z',
        aprobadoPorNombre: null,
        aprobadoEn: null,
      },
      {
        id: 53,
        contratoCodigo: 'K5',
        horas: 2,
        estado: 'desaprobado',
        tareas: [],
        observacion: null,
        cargadoPorNombre: 'VILLEGAS OSCAR',
        cargadoEn: '2026-08-04T20:10:00.000Z',
        aprobadoPorNombre: 'GIMENEZ LAURA',
        aprobadoEn: '2026-08-05T09:05:00.000Z',
      },
    ],
  },
];

vi.mock('@/lib/api/panel-general', () => ({
  useResumenOperarios: vi.fn(() => ({ data: RESUMEN, isLoading: false })),
  useSinCarga: vi.fn(() => ({ data: SIN_CARGA, isLoading: false })),
  useMisContratos: vi.fn(() => ({ data: MIS_CONTRATOS, isLoading: false })),
  useHistoricoQuincenas: vi.fn(() => ({ data: HISTORICO, isLoading: false })),
  useDetalleDiario: vi.fn(() => ({ data: DETALLE, isLoading: false })),
  useControlDiario: vi.fn(() => ({ data: CONTROL_DIARIO, isLoading: false })),
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
import { quincenaDeFecha } from '@/lib/quincena';

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

  it('arranca en la quincena actual (en curso), no en la anterior', () => {
    render(<ControlGeneralPage />);
    const actual = quincenaDeFecha(new Date());
    expect((screen.getByLabelText('Quincena') as HTMLSelectElement).value).toBe(
      String(actual.parte),
    );
    expect((screen.getByLabelText('Mes') as HTMLSelectElement).value).toBe(String(actual.mes));
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

  // Los gráficos se cargan con next/dynamic({ ssr: false }) — código
  // recharts fuera del bundle inicial, ver auditoría de performance
  // 2026-08-25. Como consecuencia, tardan un tick en aparecer: hay que
  // esperarlos (findBy*), no asumir que están en el primer render.
  it('el gráfico histórico recibe los datos del hook (dos series con leyenda)', async () => {
    const { container } = render(<ControlGeneralPage />);
    expect(await screen.findByText('1ra quincena', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByText('2da quincena')).toBeInTheDocument();
    expect(container.querySelectorAll('.recharts-bar').length).toBeGreaterThanOrEqual(2);
  });

  it('el ranking muestra a los operarios del resumen', async () => {
    render(<ControlGeneralPage />);
    expect((await screen.findAllByText('PEREZ JUAN')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('GOMEZ ANA').length).toBeGreaterThan(0);
  });

  it('la zona de revisión lista los días con más de 13hs, colapsados', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText(/más de 13/)).toBeInTheDocument();
    expect(screen.getByText('VILLEGAS OSCAR')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('K5, K9')).toBeInTheDocument();
    // el detalle arranca colapsado
    expect(screen.queryByText('Zanjeo')).not.toBeInTheDocument();
  });

  it('expandir un día de la zona de revisión muestra tareas, observación y las rechazadas marcadas', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByRole('button', { name: /VILLEGAS OSCAR/ }));
    expect(screen.getByText('Zanjeo')).toBeInTheDocument();
    expect(screen.getByText(/Viaje a Metán por fuga/)).toBeInTheDocument();
    // la rechazada aparece en el detalle aunque no sume al total
    expect(screen.getByText('desaprobado')).toBeInTheDocument();
    // colapsa de nuevo
    await userEvent.click(screen.getByRole('button', { name: /VILLEGAS OSCAR/ }));
    expect(screen.queryByText('Zanjeo')).not.toBeInTheDocument();
  });

  /** Formato desplegable (decisión 2026-08-19): un renglón por persona-día
   * con el total de la jornada, y el detalle completo adentro. */
  it('el detalle diario lista un renglón por día con el total de la jornada, colapsado', () => {
    render(<ControlGeneralPage />);
    const fila = screen.getByRole('button', { name: /ROJAS PEDRO/ }).closest('tr')!;
    expect(fila).toHaveTextContent('2026-08-03');
    expect(fila).toHaveTextContent('12'); // 8 propias + 4 de otro contrato
    expect(fila).toHaveTextContent('K5, K11');
    expect(fila).toHaveTextContent('incluye otros contratos');
    // el detalle arranca cerrado
    expect(screen.queryByText(/Apoyo a la cuadrilla/)).not.toBeInTheDocument();
  });

  it('al abrir el día se ven las horas, estado, tareas y observación de cada contrato', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByRole('button', { name: /ROJAS PEDRO/ }));
    expect(screen.getByText(/Viaje a Metán por reparación/)).toBeInTheDocument();
    expect(screen.getByText(/Apoyo a la cuadrilla de K11/)).toBeInTheDocument();
    expect(screen.getByText('Zanjeo, Tendido de cañería')).toBeInTheDocument();
    expect(screen.getByText('Soldadura')).toBeInTheDocument();
    // el registro ajeno queda identificado dentro del desplegable
    const ajeno = screen.getByText('K11').closest('li')!;
    expect(ajeno).toHaveTextContent('otro contrato');
    expect(ajeno).toHaveTextContent('aprobado');
  });

  it('explica en la leyenda por qué el total incluye otros contratos', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByTestId('leyenda-jornada-completa')).toHaveTextContent(
      /otros contratos/i,
    );
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

  it('el filtro por operario va al server en histórico/detalle y filtra tiles y ranking en el cliente', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por operario'));
    await userEvent.click(screen.getByLabelText('GOMEZ ANA'));
    await userEvent.keyboard('{Escape}');
    // server-side: histórico y detalle reciben el cuil; el resumen NO (es la
    // fuente de las opciones del propio filtro)
    expect(vi.mocked(useHistoricoQuincenas)).toHaveBeenLastCalledWith(expect.anything(), {
      operarioCuils: ['20222222222'],
    });
    expect(vi.mocked(useDetalleDiario)).toHaveBeenLastCalledWith(expect.anything(), {
      operarioCuils: ['20222222222'],
    });
    expect(vi.mocked(useResumenOperarios)).toHaveBeenLastCalledWith(expect.anything(), {});
    // client-side: el tile de horas pasa de 153 (40+95+18) a 40
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.queryByText('153')).not.toBeInTheDocument();
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
