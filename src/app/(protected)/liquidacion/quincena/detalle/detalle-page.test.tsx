import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const cargarMontos = vi.fn().mockResolvedValue({ actualizados: 1 });
const cargarKms = vi.fn().mockResolvedValue({ actualizados: 1 });

const filaJornalizado = {
  cuil: '20333333333',
  nombre: 'GOMEZ CARLOS',
  regimen: 'jornalizado',
  categoria: 'Oficial UOCRA',
  horasTotal: '104.00',
  horasCct: '88.00',
  basico: '425656.00',
  montoExtra: '116088.00',
  presentismo: '85131.20',
  totalPlus: '0.00',
  noRemunerativo: '0.00',
  total: '626875.20',
  modalidadPago: 'en_b',
  etiquetaNovedades: 'Hs Extra y Presentismo en B',
  datoFaltante: null,
  pendientesAprobacion: 2,
  duplicadoCruzado: true,
  dias: [
    {
      fecha: '2026-08-01',
      contratoCodigo: 'K5',
      tareas: ['Excavación'],
      horas: '8.00',
      cargadoPor: 'JEFE CUADRILLA',
      importeEstimado: '38696.00',
    },
  ],
  novedades: [{ tipo: 'Ausencia', desde: '2026-08-05', hasta: '2026-08-05', efecto: 'pierde presentismo' }],
};

const filaJornalizado2 = {
  cuil: '20555555555',
  nombre: 'PEREZ ANA',
  regimen: 'jornalizado',
  categoria: 'Medio Oficial UOCRA',
  horasTotal: '90.00',
  horasCct: '80.00',
  basico: '300000.00',
  montoExtra: '0.00',
  presentismo: '60000.00',
  totalPlus: '0.00',
  noRemunerativo: '0.00',
  total: '360000.00',
  modalidadPago: 'con_descuentos',
  etiquetaNovedades: '',
  datoFaltante: null,
  pendientesAprobacion: 0,
  duplicadoCruzado: false,
  dias: [
    {
      fecha: '2026-08-02',
      contratoCodigo: 'K8',
      tareas: ['Hormigón'],
      horas: '8.00',
      cargadoPor: 'JEFE CUADRILLA',
      importeEstimado: '30000.00',
    },
  ],
  novedades: [],
};

const filaMensualizado = {
  cuil: '20111111111',
  nombre: 'MENSUAL JUAN',
  regimen: 'mensualizado',
  categoria: null,
  horasTotal: null,
  horasCct: null,
  basico: '0.00',
  montoExtra: '0.00',
  presentismo: '0.00',
  totalPlus: '0.00',
  noRemunerativo: '0.00',
  total: '0.00',
  modalidadPago: null,
  etiquetaNovedades: '',
  datoFaltante: 'Falta cargar el monto mensualizado de esta quincena',
  pendientesAprobacion: 0,
  duplicadoCruzado: false,
  dias: [],
  novedades: [],
};

vi.mock('@/lib/api/liquidacion', () => ({
  useDetalleQuincena: () => ({
    data: {
      filas: [filaJornalizado, filaJornalizado2, filaMensualizado],
      sinPerfil: [{ cuil: '20444444444', nombre: 'SIN PERFIL PEDRO', horasAprobadas: '40.00', motivo: 'sin_perfil' }],
    },
    isLoading: false,
  }),
  useMontosMensualizados: () => ({
    data: [{ cuil: '20111111111', apellidoNombre: 'MENSUAL JUAN', monto: null }],
  }),
  useCargarMontosMensualizados: () => ({ mutateAsync: cargarMontos, isPending: false }),
  useKmPorTantos: () => ({ data: [] }),
  useCargarKmPorTantos: () => ({ mutateAsync: cargarKms, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

const searchParamsMock = new URLSearchParams({ anio: '2026', mes: '8', q: '1' });
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsMock,
}));

import DetalleQuincenaPage from './page';
import { formatMoney } from '@/features/liquidacion/fila-empleado';

describe('DetalleQuincenaPage', () => {
  beforeEach(() => {
    cargarMontos.mockClear();
    cargarKms.mockClear();
  });

  it('muestra la fila con sus chips de alerta', () => {
    render(<DetalleQuincenaPage />);
    expect(screen.getByText('GOMEZ CARLOS')).toBeInTheDocument();
    expect(screen.getByText(/2 pendientes/)).toBeInTheDocument();
    expect(screen.getByText(/duplicado/)).toBeInTheDocument();
  });

  it('muestra — para horas null de mensualizado y su chip de falta dato', () => {
    render(<DetalleQuincenaPage />);
    expect(screen.getByText('MENSUAL JUAN')).toBeInTheDocument();
    expect(screen.getByText(/falta dato/)).toBeInTheDocument();
  });

  it('al expandir una fila muestra los días aprobados y las novedades con su efecto', async () => {
    render(<DetalleQuincenaPage />);
    await userEvent.click(screen.getByText('GOMEZ CARLOS'));
    expect(screen.getByRole('cell', { name: 'K5' })).toBeInTheDocument();
    expect(screen.getByText(/pierde presentismo/)).toBeInTheDocument();
  });

  it('muestra fila gris para empleados sin perfil con link a Perfiles', () => {
    render(<DetalleQuincenaPage />);
    expect(screen.getByText('SIN PERFIL PEDRO')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir a perfiles/i })).toHaveAttribute('href', '/liquidacion/perfiles');
  });

  it('permite editar inline el monto mensualizado y guarda, invalidando el detalle', async () => {
    render(<DetalleQuincenaPage />);
    await userEvent.click(screen.getByText('MENSUAL JUAN'));
    await userEvent.type(screen.getByLabelText('Monto — MENSUAL JUAN'), '500000');
    await userEvent.click(screen.getByRole('button', { name: /guardar monto/i }));
    await waitFor(() =>
      expect(cargarMontos).toHaveBeenCalledWith(
        expect.objectContaining({ montos: [{ cuil: '20111111111', monto: 500000 }] }),
      ),
    );
  });

  it('el filtro de empleado por nombre reduce las filas visibles', async () => {
    render(<DetalleQuincenaPage />);
    await userEvent.type(screen.getByLabelText('Filtrar por empleado'), 'gomez');
    expect(screen.getByText('GOMEZ CARLOS')).toBeInTheDocument();
    expect(screen.queryByText('PEREZ ANA')).not.toBeInTheDocument();
    expect(screen.queryByText('MENSUAL JUAN')).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 de 4 empleados/)).toBeInTheDocument();
  });

  it('tildar una categoría filtra las filas y acota las opciones de régimen', async () => {
    render(<DetalleQuincenaPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por categoría'));
    await userEvent.click(screen.getByLabelText('Medio Oficial UOCRA'));

    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
    expect(screen.queryByText('GOMEZ CARLOS')).not.toBeInTheDocument();
    expect(screen.queryByText('MENSUAL JUAN')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Filtrar por régimen'));
    expect(screen.getByLabelText('Jornalizado')).toBeInTheDocument();
    expect(screen.queryByLabelText('Mensualizado')).not.toBeInTheDocument();
  });

  it('el filtro de contrato mantiene los totales de la fila y muestra la nota de quincena completa', async () => {
    render(<DetalleQuincenaPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por contrato'));
    await userEvent.click(screen.getByLabelText('K8'));

    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
    expect(screen.queryByText('GOMEZ CARLOS')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('PEREZ ANA'));
    expect(screen.getByText(/Los importes son de la quincena completa/)).toBeInTheDocument();
    const totalEsperado = formatMoney(filaJornalizado2.total).replace(/\s/g, ' ');
    expect(screen.getAllByText((_, node) => node?.textContent?.replace(/\s/g, ' ') === totalEsperado).length).toBeGreaterThan(0);
  });
});
