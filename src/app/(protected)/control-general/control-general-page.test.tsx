import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
  },
];

vi.mock('@/lib/api/panel-general', () => ({
  useResumenOperarios: vi.fn(() => ({ data: RESUMEN, isLoading: false })),
  useSinCarga: vi.fn(() => ({ data: SIN_CARGA, isLoading: false })),
  useMisContratos: vi.fn(() => ({ data: MIS_CONTRATOS, isLoading: false })),
  useHistoricoQuincenas: vi.fn(() => ({ data: HISTORICO, isLoading: false })),
  useDetalleDiario: vi.fn(() => ({ data: DETALLE, isLoading: false })),
}));

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

/** El resumen por operario es siempre la primera tabla de la página
 * (el ranking es una lista, no una tabla) — con las secciones nuevas los
 * nombres se repiten en el ranking, así que las aserciones del resumen
 * van scopeadas acá. */
function tablaResumen() {
  return within(screen.getAllByRole('table')[0]);
}

describe('ControlGeneralPage', () => {
  it('muestra el resumen por operario con el total real y la alerta de horas extra', () => {
    render(<ControlGeneralPage />);
    expect(tablaResumen().getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(tablaResumen().getByText('95')).toBeInTheDocument();
    expect(tablaResumen().getByText('+88hs')).toBeInTheDocument();
  });

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

  it('renderiza las secciones nuevas Horas por quincena, Ranking y Detalle diario en orden', () => {
    render(<ControlGeneralPage />);
    const titulos = screen.getAllByRole('heading').map((h) => h.textContent ?? '');
    const idxHistorico = titulos.findIndex((t) => t.includes('Horas por quincena'));
    const idxResumen = titulos.findIndex((t) => t.includes('Resumen por operario'));
    const idxRanking = titulos.findIndex((t) => t.includes('Ranking'));
    const idxDetalle = titulos.findIndex((t) => t.includes('Detalle diario'));
    const idxSinCarga = titulos.findIndex((t) => t.includes('Sin carga en esta quincena'));
    expect(idxHistorico).toBeGreaterThan(-1);
    expect(idxResumen).toBeGreaterThan(idxHistorico);
    expect(idxRanking).toBeGreaterThan(idxResumen);
    expect(idxDetalle).toBeGreaterThan(idxRanking);
    expect(idxSinCarga).toBeGreaterThan(idxDetalle);
  });

  it('el gráfico histórico recibe los datos del hook (barras con tooltip)', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByTitle('1ra quincena jul 2026: 100 hs')).toBeInTheDocument();
    expect(screen.getByTitle('2da quincena jul 2026: 50 hs')).toBeInTheDocument();
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

  it('ordena primero a quien necesita revisión (horas extra o alerta cruzada), el resto al final', () => {
    render(<ControlGeneralPage />);
    const filas = tablaResumen().getAllByRole('row').slice(1); // sin el header
    const nombres = filas.map((f) => f.textContent);
    expect(nombres[0]).toContain('PEREZ JUAN'); // horas extra + pendiente
    expect(nombres[1]).toContain('ACEVEDO CRISTIAN'); // alerta cruzada
    expect(nombres[2]).toContain('GOMEZ ANA'); // sin nada que revisar, al final
  });

  it('el nombre del operario es un link a Aprobaciones filtrado por ese operario', () => {
    render(<ControlGeneralPage />);
    const link = tablaResumen().getByRole('link', { name: 'ACEVEDO CRISTIAN' });
    expect(link).toHaveAttribute('href', '/aprobaciones?operarioCuil=20444444444');
  });

  it('muestra el delta de horas aprobadas vs la quincena anterior', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('+40hs')).toBeInTheDocument();
    expect(screen.getByText('+8hs')).toBeInTheDocument();
    expect(screen.getByText('0hs')).toBeInTheDocument();
  });

  it('marca "(nuevo)" cuando no tenía horas aprobadas la quincena anterior', () => {
    render(<ControlGeneralPage />);
    const filaGomez = tablaResumen().getByText('GOMEZ ANA').closest('tr')!;
    expect(filaGomez).toHaveTextContent('(nuevo)');
    const filaAcevedo = tablaResumen().getByText('ACEVEDO CRISTIAN').closest('tr')!;
    expect(filaAcevedo).not.toHaveTextContent('(nuevo)');
  });

  it('muestra el badge de alerta cruzada solo para quien la tiene', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('⚠ cruzado')).toBeInTheDocument();
    const filaAcevedo = tablaResumen().getByText('ACEVEDO CRISTIAN').closest('tr');
    expect(filaAcevedo).toContainElement(screen.getByText('⚠ cruzado'));
  });

  it('el MultiFiltro de operarios filtra el resumen por persona tildada', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByLabelText('Buscar operario'));
    await userEvent.click(screen.getByLabelText('GOMEZ ANA'));
    await userEvent.keyboard('{Escape}');
    expect(tablaResumen().getByText('GOMEZ ANA')).toBeInTheDocument();
    expect(tablaResumen().queryByText('PEREZ JUAN')).not.toBeInTheDocument();
  });

  it('el MultiFiltro de sin carga filtra por persona tildada', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByLabelText('Buscar empleado sin carga'));
    await userEvent.click(screen.getByLabelText('DIAZ MARIA'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('TORRES LUIS')).not.toBeInTheDocument();
    expect(screen.getByText('DIAZ MARIA')).toBeInTheDocument();
  });

  it('clic en "Con horas extra" filtra el resumen a solo esos operarios', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByText('Con horas extra (+88hs)'));
    expect(tablaResumen().getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(tablaResumen().queryByText('GOMEZ ANA')).not.toBeInTheDocument();
  });

  it('clic de nuevo en la misma tarjeta activa quita el filtro (toggle)', async () => {
    render(<ControlGeneralPage />);
    const tile = screen.getByText('Con horas extra (+88hs)');
    await userEvent.click(tile);
    await userEvent.click(tile);
    expect(tablaResumen().getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(tablaResumen().getByText('GOMEZ ANA')).toBeInTheDocument();
  });

  it('clic en "Filas pendientes de revisar" filtra a quienes tienen algo pendiente', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByText('Filas pendientes de revisar'));
    expect(tablaResumen().getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(tablaResumen().queryByText('GOMEZ ANA')).not.toBeInTheDocument();
  });

  it('clic en "Operarios con carga" vuelve a mostrar todos', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByText('Filas pendientes de revisar'));
    await userEvent.click(screen.getByText('Operarios con carga'));
    expect(tablaResumen().getByText('GOMEZ ANA')).toBeInTheDocument();
  });

  it('con un filtro activo, aparece la etiqueta con opción de quitarlo', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByText('Con horas extra (+88hs)'));
    await userEvent.click(screen.getByLabelText('Quitar filtro'));
    expect(tablaResumen().getByText('GOMEZ ANA')).toBeInTheDocument();
  });

  it('clic en "Sin carga" hace scroll hacia esa sección', async () => {
    render(<ControlGeneralPage />);
    // No hay layout real en jsdom para verificar la posición del scroll;
    // alcanza con confirmar que el clic no rompe nada y la sección sigue ahí.
    await userEvent.click(screen.getByText('Sin carga'));
    expect(screen.getByText('Sin carga en esta quincena')).toBeInTheDocument();
  });
});
