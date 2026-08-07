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
  montoKmBruto: null,
  horasTotal: '104.00',
  horasCct: '88.00',
  horasExtra: '16.00',
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
  montoKmBruto: null,
  horasTotal: '90.00',
  horasCct: '80.00',
  horasExtra: '10.00',
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
  montoKmBruto: null,
  horasTotal: null,
  horasCct: null,
  horasExtra: null,
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

// Números consistentes con ADR-015: básico = tarifa × horasCct (tope 88),
// extra SIN el ×1.5 (horasExtra × tarifa), presentismo = 20% del básico.
// tarifa implícita = 6.000 (900.000 km-bruto ÷ 6.000 = 150 horas totales).
const filaPorTantos = {
  cuil: '20666666666',
  nombre: 'RELEVADOR PABLO',
  regimen: 'por_tantos',
  categoria: 'Oficial UOCRA',
  montoKmBruto: '900000.00',
  horasTotal: '150.00',
  horasCct: '88.00',
  horasExtra: '62.00',
  basico: '528000.00',
  montoExtra: '372000.00',
  presentismo: '105600.00',
  totalPlus: '0.00',
  noRemunerativo: '0.00',
  total: '1005600.00',
  modalidadPago: null,
  etiquetaNovedades: '',
  datoFaltante: null,
  pendientesAprobacion: 0,
  duplicadoCruzado: false,
  dias: [],
  novedades: [],
};

// Los hooks de lectura se mockean con datos fijos (no dependen de la red);
// el de escritura (useCargarMontosMensualizados, que sigue siendo editable
// por el Liquidador) se deja con su implementación real para poder
// verificar la invalidación de caché real de react-query tras un guardado
// exitoso. useCargarKmPorTantos ya no lo usa esta página (el km "por
// tantos" se carga en /km-por-tantos, ver ADR-014, y acá solo se lee para
// mostrarlo en la tabla separada de por_tantos, ver ADR-015).
vi.mock('@/lib/api/liquidacion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/liquidacion')>();
  return {
    ...actual,
    useDetalleQuincena: () => ({
      data: {
        filas: [filaJornalizado, filaJornalizado2, filaMensualizado, filaPorTantos],
        sinPerfil: [{ cuil: '20444444444', nombre: 'SIN PERFIL PEDRO', horasAprobadas: '40.00', motivo: 'sin_perfil' }],
      },
      isLoading: false,
    }),
    useMontosMensualizados: () => ({
      data: [{ cuil: '20111111111', apellidoNombre: 'MENSUAL JUAN', monto: null }],
    }),
    useKmPorTantos: () => ({ data: [{ cuil: '20666666666', apellidoNombre: 'RELEVADOR PABLO', kmTotal: '175.00' }] }),
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

  it('la tabla principal separa Hs totales, Hs CCT y Hs extra en columnas propias', () => {
    renderPage();
    // Los mismos encabezados existen en las dos tablas (principal y "por
    // tantos") — alcanza con que existan, la fila de abajo confirma cuáles
    // valores le corresponden a cada uno en la tabla principal.
    expect(screen.getAllByRole('columnheader', { name: 'Hs totales' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('columnheader', { name: 'Hs CCT' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('columnheader', { name: 'Hs extra' }).length).toBeGreaterThanOrEqual(1);

    const fila = screen.getByText('GOMEZ CARLOS').closest('tr')!;
    expect(fila).toHaveTextContent('104.00'); // horas totales
    expect(fila).toHaveTextContent('88.00'); // horas CCT
    expect(fila).toHaveTextContent('16.00'); // horas extra
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

  it('"por tantos" no aparece duplicado en la tabla principal ni en su filtro de régimen', async () => {
    renderPage();
    // Solo debe existir una fila con este nombre (la de la tabla nueva),
    // no una segunda copia colada en la tabla principal.
    expect(screen.getAllByText('RELEVADOR PABLO')).toHaveLength(1);

    await userEvent.click(screen.getByLabelText('Filtrar por régimen'));
    expect(screen.queryByLabelText('Por tantos')).not.toBeInTheDocument();
  });

  it('la tabla de "por tantos" tiene su propia pestaña de detalle con las novedades del período', async () => {
    renderPage();
    const fila = screen.getByRole('cell', { name: 'RELEVADOR PABLO' }).closest('tr')!;
    expect(fila).toHaveTextContent(/ver detalle/i);

    await userEvent.click(screen.getByText('RELEVADOR PABLO'));
    expect(screen.getByText('Novedades del período')).toBeInTheDocument();
    expect(screen.getByText('Sin novedades en el período.')).toBeInTheDocument();
  });

  it('la tabla de "por tantos" muestra km, monto bruto, horas y el extra ya sin ×1.5, etiquetado en B', () => {
    renderPage();
    expect(screen.getByText('Por tantos (relevadores)')).toBeInTheDocument();
    expect(screen.getByText('Extra (en B)')).toBeInTheDocument();

    const fila = screen.getByRole('cell', { name: 'RELEVADOR PABLO' }).closest('tr')!;
    expect(fila).toHaveTextContent('175.00'); // km cargado
    expect(fila).toHaveTextContent('900.000,00'); // monto bruto (km × precio del rango)
    expect(fila).toHaveTextContent('150.00'); // horas totales
    expect(fila).toHaveTextContent('88.00'); // horas CCT
    expect(fila).toHaveTextContent('62.00'); // horas extra
    // Extra en B: 62 × tarifa, SIN el ×1.5 de jornalizado (que hubiera dado 558.000).
    expect(fila).toHaveTextContent('372.000,00');
  });

  it('el filtro de Empleado también acota la tabla de "por tantos"', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Filtrar por empleado'));
    await userEvent.click(screen.getByLabelText('GOMEZ CARLOS'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('cell', { name: 'RELEVADOR PABLO' })).not.toBeInTheDocument();
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
