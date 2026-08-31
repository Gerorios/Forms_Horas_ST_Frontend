import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CierreResumen, CierreDetalle } from '@/lib/api/liquidacion';

const descargarExcelCierre = vi.fn().mockResolvedValue(undefined);
const toastError = vi.fn();
const useCierreMock = vi.fn();
const useCierresMock = vi.fn();

const searchParamsMock = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsMock,
}));

vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

vi.mock('@/lib/api/liquidacion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/liquidacion')>();
  return {
    ...actual,
    useCierres: () => useCierresMock(),
    useCierre: (id: number | null | undefined) => useCierreMock(id),
    descargarExcelCierre: (...args: unknown[]) => descargarExcelCierre(...args),
  };
});

// v2 (vigente, con salvedades) y v1 (anterior, con nota) de la misma
// quincena de agosto; y una quincena de julio sin recierre — para probar
// agrupado + orden descendente + versiones anteriores en un solo fixture.
const cierreAgostoV2: CierreResumen = {
  id: 20,
  anio: 2026,
  mes: 8,
  quincena: 1,
  version: 2,
  cerradoPor: { cuil: '20111111111', nombre: 'ANA LIQUIDADORA' },
  nota: null,
  salvedades: ['2 empleados sin perfil de liquidación asignado'],
  createdAt: '2026-08-20T15:30:00.000Z',
  totales: { total: 1500000, norte: 900000, sur: 600000, sinZona: 0, empleados: 12 },
};

const cierreAgostoV1: CierreResumen = {
  id: 10,
  anio: 2026,
  mes: 8,
  quincena: 1,
  version: 1,
  cerradoPor: { cuil: '20111111111', nombre: 'ANA LIQUIDADORA' },
  nota: 'Se corrigió un plus individual',
  salvedades: [],
  createdAt: '2026-08-18T10:00:00.000Z',
  totales: { total: 1480000, norte: 890000, sur: 590000, sinZona: 0, empleados: 12 },
};

const cierreJulioV1: CierreResumen = {
  id: 5,
  anio: 2026,
  mes: 7,
  quincena: 2,
  version: 1,
  cerradoPor: { cuil: '20222222222', nombre: 'LUIS LIQUIDADOR' },
  nota: null,
  salvedades: [],
  createdAt: '2026-07-31T18:00:00.000Z',
  totales: { total: 1200000, norte: 700000, sur: 500000, sinZona: 0, empleados: 11 },
};

const cierresFixture: CierreResumen[] = [cierreAgostoV1, cierreJulioV1, cierreAgostoV2];

const detalleFixture: CierreDetalle = {
  ...cierreAgostoV2,
  detalle: [
    {
      cuil: '20333333333',
      apellidoNombre: 'GOMEZ CARLOS',
      legajo: 42,
      provincia: 'Salta',
      localidad: 'Tartagal',
      zona: 'norte',
      regimen: 'jornalizado',
      categoria: 'Oficial UOCRA',
      modalidadPago: 'en_b',
      tienePresentismo: true,
      precioBruto: 4838,
      horasTotal: 104,
      horasCct: 88,
      horasExtra: 16,
      totalBruto: 425656,
      montoHorasExtra: 116088,
      montoPresentismo: 85131.2,
      noRemunerativo: 0,
      montoGuardias: 0,
      montoProductividad: 0,
      plusIndividual: 0,
      kmTotal: null,
      montoKmBruto: null,
      montoA: null,
      montoB: null,
      novedadesTexto: 'Hs Extra y Presentismo en B',
      salvedad: null,
      total: '626875.20',
    },
  ],
};

import CierresPage from './page';

function renderPage() {
  return render(<CierresPage />);
}

describe('CierresPage', () => {
  beforeEach(() => {
    descargarExcelCierre.mockClear();
    toastError.mockClear();
    useCierreMock.mockReset();
    useCierreMock.mockReturnValue({ data: detalleFixture, isLoading: false });
    useCierresMock.mockReset();
    useCierresMock.mockReturnValue({ data: cierresFixture, isLoading: false });
    searchParamsMock.delete('nuevo');
  });

  it('agrupa por período mostrando la versión vigente (máxima) al frente', () => {
    renderPage();
    // La quincena de agosto tiene v1 y v2 — se muestra v2 (vigente) directo.
    expect(screen.getByText(/v2/)).toBeInTheDocument();
    expect(screen.getByText('ANA LIQUIDADORA')).toBeInTheDocument();
    // v1 no está visible todavía (sin expandir).
    expect(screen.queryByText('Se corrigió un plus individual')).not.toBeInTheDocument();
  });

  it('ordena los períodos de forma descendente (más reciente arriba)', () => {
    renderPage();
    const encabezados = screen.getAllByText(/quincena de (agosto|julio) 2026/i);
    expect(encabezados[0]).toHaveTextContent(/agosto/i);
    expect(encabezados[1]).toHaveTextContent(/julio/i);
  });

  it('muestra el total y la cantidad de salvedades como badge en la vigente', () => {
    renderPage();
    expect(screen.getByText('$ 1.500.000,00')).toBeInTheDocument();
    expect(screen.getByText(/1 salvedad/)).toBeInTheDocument();
  });

  it('no muestra badge de salvedades cuando no hay ninguna', () => {
    renderPage();
    expect(screen.queryByText(/0 salvedades/)).not.toBeInTheDocument();
  });

  it('expandir el período muestra la versión anterior con su nota', async () => {
    renderPage();
    expect(document.querySelector('[data-cierre-id="10"]')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /versión.*anterior/i }));
    const filaAnterior = document.querySelector('[data-cierre-id="10"]');
    expect(filaAnterior).toBeInTheDocument();
    expect(within(filaAnterior as HTMLElement).getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('Se corrigió un plus individual')).toBeInTheDocument();
  });

  it('resalta la fila del cierre indicado por ?nuevo=', () => {
    searchParamsMock.set('nuevo', '20');
    renderPage();
    const filaVigente = screen.getByText('ANA LIQUIDADORA').closest('[data-cierre-id]');
    expect(filaVigente).toHaveAttribute('data-resaltado', 'true');
  });

  it('si ?nuevo= apunta a una versión anterior, expande el período automáticamente y la resalta', async () => {
    searchParamsMock.set('nuevo', '10');
    renderPage();
    expect(screen.getByText('Se corrigió un plus individual')).toBeInTheDocument();
    const filas = screen.getAllByText('ANA LIQUIDADORA').map((n) => n.closest('[data-cierre-id]'));
    const filaV1 = filas.find((f) => f?.getAttribute('data-cierre-id') === '10');
    expect(filaV1).toHaveAttribute('data-resaltado', 'true');
  });

  it('muestra el estado vacío cuando no hay ningún cierre', () => {
    useCierresMock.mockReturnValue({ data: [], isLoading: false });
    renderPage();
    expect(screen.getByText('Todavía no se cerró ninguna quincena')).toBeInTheDocument();
  });

  it('el botón Excel descarga el cierre correcto con porTantos=false', async () => {
    renderPage();
    const fila = screen.getByText('ANA LIQUIDADORA').closest('[data-cierre-id]')!;
    await userEvent.click(within(fila as HTMLElement).getByRole('button', { name: 'Excel' }));
    expect(descargarExcelCierre).toHaveBeenCalledWith(20, false);
  });

  it('el botón "Por tantos B" descarga el cierre correcto con porTantos=true', async () => {
    renderPage();
    const fila = screen.getByText('ANA LIQUIDADORA').closest('[data-cierre-id]')!;
    await userEvent.click(within(fila as HTMLElement).getByRole('button', { name: /por tantos b/i }));
    expect(descargarExcelCierre).toHaveBeenCalledWith(20, true);
  });

  it('muestra un toast de error si la descarga falla', async () => {
    descargarExcelCierre.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    const fila = screen.getByText('ANA LIQUIDADORA').closest('[data-cierre-id]')!;
    await userEvent.click(within(fila as HTMLElement).getByRole('button', { name: 'Excel' }));
    expect(toastError).toHaveBeenCalled();
  });

  it('"Ver detalle" abre el diálogo con la tabla congelada de ese cierre', async () => {
    renderPage();
    const fila = screen.getByText('ANA LIQUIDADORA').closest('[data-cierre-id]')!;
    await userEvent.click(within(fila as HTMLElement).getByRole('button', { name: /ver detalle/i }));

    expect(useCierreMock).toHaveBeenCalledWith(20);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('GOMEZ CARLOS')).toBeInTheDocument();
    expect(within(dialogo).getByText('42')).toBeInTheDocument();
    expect(within(dialogo).getByText('Tartagal')).toBeInTheDocument();
    // Montos pasan por Number(...) antes de formatear (algunos llegan como string).
    expect(within(dialogo).getByText('$ 626.875,20')).toBeInTheDocument();
  });
});
