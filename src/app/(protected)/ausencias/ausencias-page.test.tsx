import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Novedad } from '@/types/domain';

const resolver = vi.fn().mockResolvedValue({});
const reabrir = vi.fn().mockResolvedValue({});
const actualizar = vi.fn().mockResolvedValue({});
const anular = vi.fn().mockResolvedValue({});
const abrirAdjunto = vi.fn().mockResolvedValue(undefined);
const h = vi.hoisted(() => ({ perfil: { rol: { nombre: 'HyS' } } }));

function nov(overrides: Partial<Novedad> = {}): Novedad {
  return {
    id: 1,
    operarioCuil: '20111111111',
    tipoNovedadId: 5,
    fechaInicio: '2026-08-10',
    fechaFin: null,
    justificacionTexto: 'gripe',
    descargoHys: null,
    pierdePresentismoHys: null,
    adjuntoUrl: null,
    estadoHys: 'pendiente',
    operario: { cuil: '20111111111', apellido_nombre: 'PEREZ JUAN', legajo: 1001 },
    tipoNovedad: { id: 5, nombre: 'Ausencia', requiereAprobacionHys: true },
    cargadoPor: { cuil: '20999999999', nombre: 'SUPERVISOR TEST' },
    estado: 'activa',
    motivoAnulacion: null,
    anuladaPorCuil: null,
    anuladaEn: null,
    createdAt: '2026-08-10T12:00:00.000Z',
    ...overrides,
  };
}

const useNovedadesMock = vi.fn((_periodo?: unknown) => ({ data: [nov()] as Novedad[], isLoading: false }));
const useResumenAusenciasMock = vi.fn((_periodo?: unknown) => ({ data: [] as unknown[], isLoading: false }));

vi.mock('@/lib/api/novedades', () => ({
  useNovedades: (periodo?: unknown) => useNovedadesMock(periodo),
  useResolverHys: () => ({ mutateAsync: resolver, isPending: false }),
  useReabrirNovedad: () => ({ mutateAsync: reabrir, isPending: false }),
  useActualizarNovedad: () => ({ mutateAsync: actualizar, isPending: false }),
  useAnularNovedad: () => ({ mutateAsync: anular, isPending: false }),
  useResumenAusencias: (periodo?: unknown) => useResumenAusenciasMock(periodo),
  abrirAdjuntoNovedad: (id: number) => abrirAdjunto(id),
  // Usado por EditarNovedadDialog (features/novedades/editar-novedad-dialog.tsx).
  useTiposNovedad: () => ({
    data: [{ id: 5, nombre: 'Ausencia', requiereAprobacionHys: true }],
  }),
}));
// Usado por OperariosSelect, dentro de EditarNovedadDialog.
vi.mock('@/lib/api/empleados', () => ({
  useBuscarEmpleados: () => ({ data: [] }),
}));
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ perfil: h.perfil }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() } }));

import AusenciasPage from './page';

describe('AusenciasPage', () => {
  beforeEach(() => {
    resolver.mockClear();
    reabrir.mockClear();
    actualizar.mockClear();
    anular.mockClear();
    abrirAdjunto.mockClear();
    h.perfil = { rol: { nombre: 'HyS' } };
    useNovedadesMock.mockReset();
    useNovedadesMock.mockReturnValue({ data: [nov()], isLoading: false });
    useResumenAusenciasMock.mockReset();
    useResumenAusenciasMock.mockReturnValue({ data: [], isLoading: false });
  });

  describe('paginación (20 por página, pedido 2026-09-03)', () => {
    const muchas = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        nov({ id: 100 + i, operario: { cuil: `2000000${String(i).padStart(4, '0')}`, apellido_nombre: `OPERARIO ${String(i).padStart(2, '0')}`, legajo: i } }),
      );

    it('con 25 pendientes muestra 20 filas y el pie "Página 1 de 2 · 25 ausencias"; Siguiente muestra las 5 restantes', { timeout: 15000 }, async () => {
      useNovedadesMock.mockReturnValue({ data: muchas(25), isLoading: false });
      render(<AusenciasPage />);
      expect(screen.getByText('OPERARIO 00')).toBeInTheDocument();
      expect(screen.getByText('OPERARIO 19')).toBeInTheDocument();
      expect(screen.queryByText('OPERARIO 20')).not.toBeInTheDocument();
      expect(screen.getByText('Página 1 de 2 · 25 ausencias')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
      expect(screen.getByText('OPERARIO 20')).toBeInTheDocument();
      expect(screen.getByText('OPERARIO 24')).toBeInTheDocument();
      expect(screen.queryByText('OPERARIO 00')).not.toBeInTheDocument();
      expect(screen.getByText('Página 2 de 2 · 25 ausencias')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    });

    it('con 20 o menos no muestra el pie de paginación', () => {
      useNovedadesMock.mockReturnValue({ data: muchas(20), isLoading: false });
      render(<AusenciasPage />);
      expect(screen.queryByText(/^Página /)).not.toBeInTheDocument();
    });

    it('cambiar de pestaña vuelve a la página 1', { timeout: 15000 }, async () => {
      useNovedadesMock.mockReturnValue({
        data: [...muchas(25), ...muchas(3).map((n) => ({ ...n, id: n.id + 500, estadoHys: 'aprobada' as const }))],
        isLoading: false,
      });
      render(<AusenciasPage />);
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
      expect(screen.getByText('Página 2 de 2 · 25 ausencias')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^Justificadas/ }));
      // 3 justificadas: una sola página, sin pie; al volver a Pendientes arranca en 1.
      expect(screen.queryByText(/^Página /)).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^Pendientes/ }));
      expect(screen.getByText('Página 1 de 2 · 25 ausencias')).toBeInTheDocument();
    });
  });

  it('filtra a solo novedades de tipo Ausencia (client-side)', () => {
    useNovedadesMock.mockReturnValue({
      data: [
        nov({ id: 1, operario: { cuil: '20111111111', apellido_nombre: 'PEREZ JUAN', legajo: 1001 } }),
        nov({
          id: 2,
          tipoNovedadId: 8,
          tipoNovedad: { id: 8, nombre: 'Viáticos', requiereAprobacionHys: false },
          operario: { cuil: '20222222222', apellido_nombre: 'GOMEZ ANA', legajo: 1002 },
        }),
      ],
      isLoading: false,
    });
    render(<AusenciasPage />);
    expect(screen.getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(screen.queryByText('GOMEZ ANA')).not.toBeInTheDocument();
  });

  it('usa las etiquetas renombradas de las pestañas de estado', () => {
    render(<AusenciasPage />);
    expect(screen.getByRole('button', { name: 'Pendientes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Justificadas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Injustificadas' })).toBeInTheDocument();
  });

  it('usa las etiquetas renombradas de las acciones (Justificar / No justificar)', async () => {
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(screen.getByRole('button', { name: 'Justificar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No justificar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^aprobar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^desaprobar$/i })).not.toBeInTheDocument();
  });

  it('tiene el selector de período mandatorio (Mes/Año/Quincena) y lo pasa a useNovedades', () => {
    render(<AusenciasPage />);
    expect(screen.getByLabelText('Mes')).toBeInTheDocument();
    expect(screen.getByLabelText('Año')).toBeInTheDocument();
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();
    expect(useNovedadesMock).toHaveBeenCalledWith(
      expect.objectContaining({ anio: expect.any(Number), mes: expect.any(Number), parte: expect.any(Number) }),
    );
  });

  it('justificar exige elegir si pierde presentismo antes de habilitar la confirmación (ADR-022)', async () => {
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    await userEvent.click(screen.getByRole('button', { name: 'Justificar' }));
    expect(screen.getByLabelText('Descargo')).toBeInTheDocument();
    // Sin elegir Sí/No todavía, el botón de confirmar queda deshabilitado.
    expect(screen.getByRole('button', { name: 'Justificar' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Justificar' }));
    expect(resolver).not.toHaveBeenCalled();
  });

  it('justificar + "Sí, pierde presentismo" llama a resolver-hys con pierdePresentismoHys true', async () => {
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    await userEvent.click(screen.getByRole('button', { name: 'Justificar' }));
    await userEvent.type(screen.getByLabelText('Descargo'), 'presentó certificado');
    await userEvent.click(screen.getByRole('button', { name: 'Sí, pierde presentismo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Justificar' }));
    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith({
        id: 1,
        estadoHys: 'aprobada',
        descargoHys: 'presentó certificado',
        pierdePresentismoHys: true,
      }),
    );
  });

  it('justificar + "No pierde presentismo" llama a resolver-hys con pierdePresentismoHys false (ej. licencia especial)', async () => {
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    await userEvent.click(screen.getByRole('button', { name: 'Justificar' }));
    await userEvent.type(screen.getByLabelText('Descargo'), 'licencia especial por paternidad');
    await userEvent.click(screen.getByRole('button', { name: 'No pierde presentismo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Justificar' }));
    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith({
        id: 1,
        estadoHys: 'aprobada',
        descargoHys: 'licencia especial por paternidad',
        pierdePresentismoHys: false,
      }),
    );
  });

  it('no justificar no pregunta por presentismo y llama a resolver-hys sin pierdePresentismoHys (siempre lo pierde)', async () => {
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    await userEvent.click(screen.getByRole('button', { name: 'No justificar' }));
    expect(screen.queryByText('¿Esta ausencia hace perder el presentismo?')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'No justificar' }));
    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith({
        id: 1,
        estadoHys: 'desaprobada',
        descargoHys: undefined,
        pierdePresentismoHys: undefined,
      }),
    );
  });

  it('en la pestaña Justificadas se puede reabrir la novedad', async () => {
    useNovedadesMock.mockReturnValue({ data: [nov({ estadoHys: 'aprobada' })], isLoading: false });
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Justificadas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    await waitFor(() => expect(reabrir).toHaveBeenCalledWith(1));
  });

  it('en la pestaña Injustificadas se puede reabrir la novedad', async () => {
    useNovedadesMock.mockReturnValue({ data: [nov({ estadoHys: 'desaprobada' })], isLoading: false });
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Injustificadas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    await waitFor(() => expect(reabrir).toHaveBeenCalledWith(1));
  });

  it('muestra "Ver certificado" en el detalle cuando adjuntoUrl es truthy, y lo abre al clickear', async () => {
    useNovedadesMock.mockReturnValue({ data: [nov({ adjuntoUrl: 'novedades/1/adjunto.pdf' })], isLoading: false });
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    const boton = screen.getByRole('button', { name: 'Ver certificado' });
    await userEvent.click(boton);
    await waitFor(() => expect(abrirAdjunto).toHaveBeenCalledWith(1));
  });

  it('NO muestra "Ver certificado" en el detalle cuando adjuntoUrl es null', async () => {
    render(<AusenciasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(screen.queryByRole('button', { name: 'Ver certificado' })).not.toBeInTheDocument();
  });

  it('el botón Exportar es visible para HyS', () => {
    h.perfil = { rol: { nombre: 'HyS' } };
    render(<AusenciasPage />);
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
  });

  it('el botón Exportar es visible para Admin', () => {
    h.perfil = { rol: { nombre: 'Admin' } };
    render(<AusenciasPage />);
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
  });

  it('el botón Exportar NO es visible para otros roles', () => {
    h.perfil = { rol: { nombre: 'Supervisor' } };
    render(<AusenciasPage />);
    expect(screen.queryByRole('button', { name: 'Exportar' })).not.toBeInTheDocument();
  });

  describe('Editar / Anular', () => {
    it('los botones Editar y Anular son visibles para HyS en el detalle', async () => {
      h.perfil = { rol: { nombre: 'HyS' } };
      render(<AusenciasPage />);
      await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
      expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument();
    });

    it('los botones Editar y Anular son visibles para Admin en el detalle', async () => {
      h.perfil = { rol: { nombre: 'Admin' } };
      render(<AusenciasPage />);
      await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
      expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument();
    });

    it('los botones Editar y Anular NO son visibles para otros roles en el detalle', async () => {
      h.perfil = { rol: { nombre: 'Supervisor' } };
      render(<AusenciasPage />);
      await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
      expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
    });

    it('clickear "Editar" abre el formulario precargado con los datos actuales', async () => {
      render(<AusenciasPage />);
      await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
      await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
      expect(screen.getByText('Editar novedad')).toBeInTheDocument();
      expect(screen.getByLabelText('Fecha inicio')).toHaveValue('2026-08-10');
    });

    it('anular: el diálogo pide motivo y checkbox de confirmación, y llama a la mutación con {id, motivo}', async () => {
      render(<AusenciasPage />);
      await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
      await userEvent.click(screen.getByRole('button', { name: 'Anular' }));

      const confirmar = screen.getByRole('button', { name: 'Anular novedad' });
      expect(confirmar).toBeDisabled();

      await userEvent.type(screen.getByLabelText('Motivo de anulación'), 'cargada por error');
      expect(confirmar).toBeDisabled();

      await userEvent.click(screen.getByRole('checkbox', { name: /confirmo que quiero anular/i }));
      expect(confirmar).toBeEnabled();

      await userEvent.click(confirmar);
      await waitFor(() => expect(anular).toHaveBeenCalledWith({ id: 1, motivo: 'cargada por error' }));
    });
  });

  describe('Vigencia (activa/anulada)', () => {
    it('las ausencias anuladas no aparecen en las pestañas por defecto', () => {
      useNovedadesMock.mockReturnValue({
        data: [
          nov({ id: 1, operario: { cuil: '20111111111', apellido_nombre: 'PEREZ JUAN', legajo: 1001 }, estado: 'activa' }),
          nov({
            id: 2,
            operario: { cuil: '20222222222', apellido_nombre: 'GOMEZ ANA', legajo: 1002 },
            estado: 'anulada',
            motivoAnulacion: 'duplicada',
          }),
        ],
        isLoading: false,
      });
      render(<AusenciasPage />);
      expect(screen.getByText('PEREZ JUAN')).toBeInTheDocument();
      expect(screen.queryByText('GOMEZ ANA')).not.toBeInTheDocument();
    });

    it('"Ver anuladas" muestra una lista aparte, de solo lectura, con las ausencias anuladas', async () => {
      useNovedadesMock.mockReturnValue({
        data: [
          nov({ id: 1, operario: { cuil: '20111111111', apellido_nombre: 'PEREZ JUAN', legajo: 1001 }, estado: 'activa' }),
          nov({
            id: 2,
            operario: { cuil: '20222222222', apellido_nombre: 'GOMEZ ANA', legajo: 1002 },
            estado: 'anulada',
            motivoAnulacion: 'duplicada',
          }),
        ],
        isLoading: false,
      });
      render(<AusenciasPage />);
      expect(screen.queryByText('GOMEZ ANA')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('checkbox', { name: 'Ver anuladas' }));
      expect(screen.getByText('GOMEZ ANA')).toBeInTheDocument();
      expect(screen.getByText('Motivo: duplicada')).toBeInTheDocument();
    });
  });
});
