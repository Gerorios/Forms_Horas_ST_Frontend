import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CierreDetalle } from '@/lib/api/liquidacion';

const descargarExcelCierre = vi.fn().mockResolvedValue(undefined);
const useCierreMock = vi.fn();
let paramsMock: { id: string } = { id: '20' };

vi.mock('next/navigation', () => ({
  useParams: () => paramsMock,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

vi.mock('@/lib/api/liquidacion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/liquidacion')>();
  return {
    ...actual,
    useCierre: (id: number | null | undefined) => useCierreMock(id),
    descargarExcelCierre: (...args: unknown[]) => descargarExcelCierre(...args),
  };
});

const detalleFixture: CierreDetalle = {
  id: 20,
  anio: 2026,
  mes: 8,
  quincena: 1,
  version: 2,
  cerradoPor: { cuil: '20111111111', nombre: 'ANA LIQUIDADORA' },
  nota: 'Se corrigió un plus individual',
  salvedades: ['2 empleados sin perfil de liquidación asignado'],
  createdAt: '2026-08-20T15:30:00.000Z',
  totales: { total: 1500000, norte: 900000, sur: 600000, sinZona: 0, empleados: 12 },
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

import CierreDetallePage from './page';

describe('CierreDetallePage', () => {
  beforeEach(() => {
    descargarExcelCierre.mockClear();
    useCierreMock.mockReset();
    useCierreMock.mockReturnValue({ data: detalleFixture, isLoading: false });
    paramsMock = { id: '20' };
  });

  it('muestra cabecera del cierre (versión, cerrado por, nota, salvedades, totales)', () => {
    render(<CierreDetallePage />);
    expect(useCierreMock).toHaveBeenCalledWith(20);
    expect(screen.getByText(/1ª quincena de agosto 2026 — v2/)).toBeInTheDocument();
    expect(screen.getByText('ANA LIQUIDADORA')).toBeInTheDocument();
    expect(screen.getByText('Se corrigió un plus individual')).toBeInTheDocument();
    expect(screen.getByText('2 empleados sin perfil de liquidación asignado')).toBeInTheDocument();
    expect(screen.getByText('$ 1.500.000,00')).toBeInTheDocument();
  });

  it('la tabla muestra las columnas principales y expande el resto por fila', async () => {
    render(<CierreDetallePage />);
    // Columnas principales visibles; los secundarios (legajo, localidad) no.
    expect(screen.getByText('GOMEZ CARLOS')).toBeInTheDocument();
    // Montos pasan por Number(...) antes de formatear (algunos llegan como string).
    expect(screen.getByText('$ 626.875,20')).toBeInTheDocument();
    expect(screen.queryByText('Tartagal')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('GOMEZ CARLOS'));
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Tartagal')).toBeInTheDocument();
    expect(screen.getByText('Hs Extra y Presentismo en B')).toBeInTheDocument();
  });

  it('los botones de descarga usan el id de la ruta', async () => {
    render(<CierreDetallePage />);
    await userEvent.click(screen.getByRole('button', { name: 'Excel' }));
    expect(descargarExcelCierre).toHaveBeenCalledWith(20, false);
    await userEvent.click(screen.getByRole('button', { name: /por tantos b/i }));
    expect(descargarExcelCierre).toHaveBeenCalledWith(20, true);
  });

  it('con id inválido no consulta y ofrece volver a la lista', () => {
    paramsMock = { id: 'abc' };
    render(<CierreDetallePage />);
    expect(useCierreMock).toHaveBeenCalledWith(null);
    expect(screen.getByRole('link', { name: /volvé a la lista de cierres/i })).toHaveAttribute(
      'href',
      '/liquidacion/cierres',
    );
  });
});
