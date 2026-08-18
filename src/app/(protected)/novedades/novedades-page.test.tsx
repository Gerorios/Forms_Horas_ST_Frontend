import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const h = vi.hoisted(() => ({
  perfil: { rol: { nombre: 'Supervisor' }, tiposNovedadHabilitados: [] } as {
    rol: { nombre: string };
    tiposNovedadHabilitados: { tipoNovedad: { id: number; nombre: string } }[];
  },
}));

const NOVEDADES_FILTROS = [
  {
    id: 1,
    operarioCuil: '20111111111',
    tipoNovedadId: 5,
    fechaInicio: '2026-08-05',
    fechaFin: null,
    justificacionTexto: null,
    estadoHys: 'pendiente',
    operario: { cuil: '20111111111', apellido_nombre: 'GOMEZ JUAN' },
    tipoNovedad: { id: 5, nombre: 'Ausencia', requiereAprobacionHys: true },
    cargadoPor: { cuil: '20999999999', email: 'sup@test.local' },
  },
  {
    id: 2,
    operarioCuil: '20222222222',
    tipoNovedadId: 8,
    fechaInicio: '2026-08-10',
    fechaFin: null,
    justificacionTexto: null,
    estadoHys: 'no_aplica',
    operario: { cuil: '20222222222', apellido_nombre: 'PEREZ ANA' },
    tipoNovedad: { id: 8, nombre: 'Viáticos', requiereAprobacionHys: false },
    cargadoPor: { cuil: '20999999999', email: 'sup@test.local' },
  },
];
const useNovedadesMock = vi.fn((_periodo?: { anio: number; mes: number; parte: number }) => ({
  data: [] as typeof NOVEDADES_FILTROS,
  isLoading: false,
}));

vi.mock('@/lib/api/novedades', () => ({
  useNovedades: (periodo?: { anio: number; mes: number; parte: number }) => useNovedadesMock(periodo),
  useTiposNovedad: () => ({
    data: [
      { id: 5, nombre: 'Ausencia', requiereAprobacionHys: true },
      { id: 8, nombre: 'Viáticos', requiereAprobacionHys: false },
    ],
  }),
  useCrearNovedad: () => ({ mutateAsync: crear, isPending: false }),
}));
vi.mock('@/lib/api/empleados', () => ({
  useBuscarEmpleados: () => ({ data: [{ cuil: '20169', apellido_nombre: 'GOMEZ', legajo: 1, cargo: 'OF' }] }),
}));
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ perfil: h.perfil }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() } }));

import NovedadesPage from './page';

describe('NovedadesPage', () => {
  beforeEach(() => {
    crear.mockClear();
    h.perfil = { rol: { nombre: 'Supervisor' }, tiposNovedadHabilitados: [] };
    useNovedadesMock.mockReset();
    useNovedadesMock.mockReturnValue({ data: [], isLoading: false });
  });

  it('crea una novedad con operario, tipo y fecha inicio', async () => {
    render(<NovedadesPage />);
    await userEvent.click(screen.getByRole('button', { name: /nueva novedad/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), '5');
    await userEvent.type(screen.getByLabelText('Fecha inicio'), '2026-07-10');
    await userEvent.click(screen.getByRole('button', { name: /cargar novedad/i }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({ operarioCuil: '20169', tipoNovedadId: 5, fechaInicio: '2026-07-10' }),
      ),
    );
  });

  it('Supervisor ve el catálogo completo de tipos, sin filtrar', async () => {
    render(<NovedadesPage />);
    await userEvent.click(screen.getByRole('button', { name: /nueva novedad/i }));
    expect(screen.getByRole('option', { name: 'Ausencia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Viáticos' })).toBeInTheDocument();
  });

  it('JefeCuadrilla solo ve los tipos que le habilitaron', async () => {
    h.perfil = {
      rol: { nombre: 'JefeCuadrilla' },
      tiposNovedadHabilitados: [{ tipoNovedad: { id: 8, nombre: 'Viáticos' } }],
    };
    render(<NovedadesPage />);
    await userEvent.click(screen.getByRole('button', { name: /nueva novedad/i }));
    expect(screen.getByRole('option', { name: 'Viáticos' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Ausencia' })).not.toBeInTheDocument();
  });

  it('JefeCuadrilla ve la aclaración de que solo se listan las que cargó', () => {
    h.perfil = { rol: { nombre: 'JefeCuadrilla' }, tiposNovedadHabilitados: [] };
    render(<NovedadesPage />);
    expect(screen.getByText('Las que cargaste vos')).toBeInTheDocument();
  });

  it('Supervisor NO ve la aclaración (ve el listado completo)', () => {
    render(<NovedadesPage />);
    expect(screen.queryByText('Las que cargaste vos')).not.toBeInTheDocument();
  });

  it('filtra la tabla por tipo, operario y estado (MultiFiltro)', async () => {
    useNovedadesMock.mockReturnValue({ data: NOVEDADES_FILTROS, isLoading: false });
    render(<NovedadesPage />);
    expect(screen.getByText('GOMEZ JUAN')).toBeInTheDocument();
    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Filtrar por tipo de novedad'));
    await userEvent.click(screen.getByLabelText('Ausencia'));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('GOMEZ JUAN')).toBeInTheDocument();
    expect(screen.queryByText('PEREZ ANA')).not.toBeInTheDocument();
  });

  it('filtra por operario', async () => {
    useNovedadesMock.mockReturnValue({ data: NOVEDADES_FILTROS, isLoading: false });
    render(<NovedadesPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por operario'));
    await userEvent.click(screen.getByLabelText('PEREZ ANA'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('GOMEZ JUAN')).not.toBeInTheDocument();
    expect(screen.getByText('PEREZ ANA')).toBeInTheDocument();
  });

  it('filtra por estado', async () => {
    useNovedadesMock.mockReturnValue({ data: NOVEDADES_FILTROS, isLoading: false });
    render(<NovedadesPage />);
    await userEvent.click(screen.getByLabelText('Filtrar por estado'));
    await userEvent.click(screen.getByLabelText('Pendiente'));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('GOMEZ JUAN')).toBeInTheDocument();
    expect(screen.queryByText('PEREZ ANA')).not.toBeInTheDocument();
  });

  it('el filtro "Período" es un popover como Tipo/Operario/Estado: al abrirlo, activa la quincena actual', async () => {
    render(<NovedadesPage />);
    expect(screen.queryByLabelText('Mes')).not.toBeInTheDocument();
    expect(useNovedadesMock).toHaveBeenLastCalledWith(undefined);

    await userEvent.click(screen.getByLabelText('Filtrar por período'));
    expect(screen.getByLabelText('Mes')).toBeInTheDocument();
    expect(screen.getByLabelText('Año')).toBeInTheDocument();
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();

    const ultimaLlamada = useNovedadesMock.mock.calls.at(-1);
    expect(ultimaLlamada?.[0]).toEqual(
      expect.objectContaining({ anio: expect.any(Number), mes: expect.any(Number), parte: expect.any(Number) }),
    );

    // "Todos los períodos" desactiva el filtro de nuevo.
    await userEvent.click(screen.getByRole('button', { name: 'Todos los períodos' }));
    expect(useNovedadesMock).toHaveBeenLastCalledWith(undefined);
  });

  it('sin tildar el período, useNovedades se llama sin argumento (todas)', () => {
    render(<NovedadesPage />);
    expect(useNovedadesMock).toHaveBeenLastCalledWith(undefined);
  });

  it('JefeContrato no ve el botón "Nueva novedad" (solo consulta)', () => {
    h.perfil = { rol: { nombre: 'JefeContrato' }, tiposNovedadHabilitados: [] };
    render(<NovedadesPage />);
    expect(screen.queryByRole('button', { name: /nueva novedad/i })).not.toBeInTheDocument();
  });

  it('HyS no ve el botón "Nueva novedad" (no puede cargar)', () => {
    h.perfil = { rol: { nombre: 'HyS' }, tiposNovedadHabilitados: [] };
    render(<NovedadesPage />);
    expect(screen.queryByRole('button', { name: /nueva novedad/i })).not.toBeInTheDocument();
  });
});
