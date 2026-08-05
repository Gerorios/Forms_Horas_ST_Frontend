import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const apiGet = vi.fn();
const apiPost = vi.fn().mockResolvedValue({ data: { actualizados: 1 } });
const apiDelete = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    delete: (...args: unknown[]) => apiDelete(...args),
  },
}));

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

// Los hooks de lectura se mockean con datos fijos (no dependen de la red);
// los de escritura (useCargarMontosMensualizados / useCargarKmPorTantos) se
// dejan con su implementación real para poder verificar la invalidación de
// caché real de react-query tras un guardado exitoso.
vi.mock('@/lib/api/liquidacion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/liquidacion')>();
  return {
    ...actual,
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
    useKmPorTantos: () => ({ data: [] }),
  };
});
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

const searchParamsMock = new URLSearchParams({ anio: '2026', mes: '8', q: '1' });
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsMock,
}));

import DetalleQuincenaPage from './page';
import { formatMoney } from '@/features/liquidacion/fila-empleado';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <DetalleQuincenaPage />
    </QueryClientProvider>,
  );
  return { qc, invalidateSpy };
}

describe('DetalleQuincenaPage', () => {
  beforeEach(() => {
    apiPost.mockClear();
    apiGet.mockClear();
  });

  it('muestra la fila con sus chips de alerta', () => {
    renderPage();
    expect(screen.getByText('GOMEZ CARLOS')).toBeInTheDocument();
    expect(screen.getByText(/2 pendientes/)).toBeInTheDocument();
    expect(screen.getByText(/duplicado/)).toBeInTheDocument();
  });

  it('muestra — para horas null de mensualizado y su chip de falta dato', () => {
    renderPage();
    expect(screen.getByText('MENSUAL JUAN')).toBeInTheDocument();
    expect(screen.getByText(/falta dato/)).toBeInTheDocument();
  });

  it('al expandir una fila muestra los días aprobados y las novedades con su efecto', async () => {
    renderPage();
    await userEvent.click(screen.getByText('GOMEZ CARLOS'));
    expect(screen.getByRole('cell', { name: 'K5' })).toBeInTheDocument();
    expect(screen.getByText(/pierde presentismo/)).toBeInTheDocument();
  });

  it('muestra fila gris para empleados sin perfil con link a Perfiles', () => {
    renderPage();
    expect(screen.getByText('SIN PERFIL PEDRO')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir a perfiles/i })).toHaveAttribute('href', '/liquidacion/perfiles');
  });

  it('permite editar inline el monto mensualizado, lo guarda e invalida el detalle en caché', async () => {
    const { invalidateSpy } = renderPage();
    await userEvent.click(screen.getByText('MENSUAL JUAN'));
    await userEvent.type(screen.getByLabelText('Monto — MENSUAL JUAN'), '500000');
    await userEvent.click(screen.getByRole('button', { name: /guardar monto/i }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        '/liquidacion/quincena/montos-mensualizados',
        expect.objectContaining({ montos: [{ cuil: '20111111111', monto: 500000 }] }),
      ),
    );

    // La invalidación real de react-query debe alcanzar tanto la query de
    // montos-mensualizados como el detalle de la quincena (por prefijo), que
    // es lo que hace que la tabla no quede stale tras el edit inline.
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['liquidacion', 'quincena-detalle'] }),
      ),
    );
  });

  it('el filtro de empleado (MultiFiltro de personas) reduce las filas visibles', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Filtrar por empleado'));
    await userEvent.click(screen.getByLabelText('GOMEZ CARLOS'));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('cell', { name: 'GOMEZ CARLOS' })).toBeInTheDocument();
    expect(screen.queryByText('PEREZ ANA')).not.toBeInTheDocument();
    expect(screen.queryByText('MENSUAL JUAN')).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 de 4 empleados/)).toBeInTheDocument();
  });

  it('tildar una categoría filtra las filas y acota las opciones de régimen', async () => {
    renderPage();
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
    renderPage();
    await userEvent.click(screen.getByLabelText('Filtrar por contrato'));
    await userEvent.click(screen.getByLabelText('K8'));

    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
    expect(screen.queryByText('GOMEZ CARLOS')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('PEREZ ANA'));
    expect(screen.getByText(/Los importes son de la quincena completa/)).toBeInTheDocument();
    const totalEsperado = formatMoney(filaJornalizado2.total).replace(/\s/g, ' ');
    expect(screen.getAllByText((_, node) => node?.textContent?.replace(/\s/g, ' ') === totalEsperado).length).toBeGreaterThan(0);
  });

  it('el filtro de contrato mantiene visible la fila sin perfil, atenuada', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Filtrar por contrato'));
    await userEvent.click(screen.getByLabelText('K8'));

    const filaSinPerfil = screen.getByText('SIN PERFIL PEDRO').closest('tr');
    expect(filaSinPerfil).not.toBeNull();
    expect(filaSinPerfil).toHaveAttribute('title', 'Sin datos de contrato para filtrar');
  });

  it('muestra un mensaje de período inválido cuando falta o es incorrecto un query param', () => {
    searchParamsMock.set('mes', '13');
    try {
      renderPage();
      expect(screen.getAllByText(/Período inválido/).length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: /volvé al panel de quincenas/i })).toHaveAttribute(
        'href',
        '/liquidacion/quincena',
      );
    } finally {
      searchParamsMock.set('mes', '8');
    }
  });
});
