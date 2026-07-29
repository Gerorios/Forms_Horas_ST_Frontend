import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const cargarMontos = vi.fn().mockResolvedValue({ actualizados: 1 });
const cargarKms = vi.fn().mockResolvedValue({ actualizados: 1 });

vi.mock('@/lib/api/liquidacion', () => ({
  useMontosMensualizados: () => ({
    data: [{ cuil: '20111111111', apellidoNombre: 'MENSUAL JUAN', monto: null }],
  }),
  useCargarMontosMensualizados: () => ({ mutateAsync: cargarMontos, isPending: false }),
  useKmPorTantos: () => ({
    data: [{ cuil: '20222222222', apellidoNombre: 'RELEVADOR ANA', kmTotal: '65.00' }],
  }),
  useCargarKmPorTantos: () => ({ mutateAsync: cargarKms, isPending: false }),
  useCalculoQuincena: () => ({
    data: [
      {
        cuil: '20333333333',
        apellidoNombre: 'GOMEZ CARLOS',
        legajo: 1,
        categoria: 'Oficial UOCRA',
        regimen: 'jornalizado',
        provincia: 'Tucuman',
        precioBruto: 4837,
        horasTotal: 104,
        horasCct: 88,
        totalBruto: 425656,
        horasExtra: 16,
        montoHorasExtra: 116088,
        tienePresentismo: true,
        montoPresentismo: 85131.2,
        plus: [],
        noRemunerativo: 0,
        novedadesTexto: 'Hs Extra y Presentismo en B',
        total: 626875.2,
        datoFaltante: null,
      },
      {
        cuil: '20111111111',
        apellidoNombre: 'MENSUAL JUAN',
        legajo: 2,
        categoria: null,
        regimen: 'mensualizado',
        provincia: 'Tucuman',
        precioBruto: null,
        horasTotal: 1,
        horasCct: 1,
        totalBruto: 0,
        horasExtra: 0,
        montoHorasExtra: 0,
        tienePresentismo: false,
        montoPresentismo: 0,
        plus: [],
        noRemunerativo: 0,
        novedadesTexto: '',
        total: 0,
        datoFaltante: 'Falta cargar el monto mensualizado de esta quincena',
      },
    ],
    isLoading: false,
  }),
  useAlertasQuincena: () => ({
    data: {
      sinPerfil: [{ cuil: '20444444444', apellidoNombre: 'SIN PERFIL PEDRO', horasAprobadas: 40, horasPendientes: 0 }],
      perfilIncompleto: [
        { cuil: '20111111111', apellidoNombre: 'MENSUAL JUAN', regimen: 'mensualizado', faltaCategoria: false, faltaModalidad: true },
      ],
      sinHorasAprobadas: [
        { cuil: '20555555555', apellidoNombre: 'PENDIENTE LUIS', motivo: 'pendientes', horasPendientes: 20 },
        { cuil: '20666666666', apellidoNombre: 'NUNCA CARGO ANA', motivo: 'sin_declarar', horasPendientes: 0 },
      ],
    },
  }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import CalculoQuincenaPage from './page';

describe('CalculoQuincenaPage', () => {
  beforeEach(() => { cargarMontos.mockClear(); cargarKms.mockClear(); });

  it('muestra la tabla calculada con el total por empleado', () => {
    render(<CalculoQuincenaPage />);
    expect(screen.getByText('GOMEZ CARLOS')).toBeInTheDocument();
    expect(screen.getByText('$ 626.875,20')).toBeInTheDocument();
  });

  it('avisa qué datos faltan cuando hay un dato pendiente', () => {
    render(<CalculoQuincenaPage />);
    expect(screen.getByText(/Faltan datos para calcular/)).toBeInTheDocument();
    expect(screen.getByText(/MENSUAL JUAN: Falta cargar el monto mensualizado/)).toBeInTheDocument();
  });

  it('permite cargar el monto mensualizado de la quincena', async () => {
    render(<CalculoQuincenaPage />);
    await userEvent.type(screen.getByLabelText('Monto — MENSUAL JUAN'), '500000');
    await userEvent.click(screen.getByRole('button', { name: /guardar montos/i }));
    await waitFor(() =>
      expect(cargarMontos).toHaveBeenCalledWith(
        expect.objectContaining({ montos: [{ cuil: '20111111111', monto: 500000 }] }),
      ),
    );
  });

  it('muestra las 3 alertas: sin perfil, perfil incompleto y jornalizados sin horas aprobadas', () => {
    render(<CalculoQuincenaPage />);
    expect(screen.getByText(/SIN PERFIL PEDRO/)).toBeInTheDocument();
    expect(screen.getByText(/MENSUAL JUAN.*falta modalidad de pago/)).toBeInTheDocument();
    expect(screen.getByText(/PENDIENTE LUIS.*tiene 20.00hs cargadas sin aprobar/)).toBeInTheDocument();
    expect(screen.getByText(/NUNCA CARGO ANA.*nunca declaró horas/)).toBeInTheDocument();
  });

  it('permite cargar los km de por tantos de la quincena', async () => {
    render(<CalculoQuincenaPage />);
    await userEvent.click(screen.getByRole('button', { name: /guardar km/i }));
    await waitFor(() =>
      expect(cargarKms).toHaveBeenCalledWith(
        expect.objectContaining({ kms: [{ cuil: '20222222222', kmTotal: 65 }] }),
      ),
    );
  });
});
