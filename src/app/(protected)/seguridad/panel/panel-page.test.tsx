import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReporteSeguridad } from '@/lib/api/seguridad';

const h = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  error: false,
  refetch: vi.fn(),
  lista: [] as unknown[],
  pendientes: [] as unknown[],
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => h.params,
  useRouter: () => ({ replace: h.replace }),
  usePathname: () => '/seguridad/panel',
}));
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ perfil: { cuil: '27222', rol: { nombre: 'HyS' } } }) }));
vi.mock('@/lib/api/seguridad', () => ({
  // La segunda llamada es la cola de pendientes (contador y alarma).
  usePanelReportes: (f: { estado?: string; tipo?: string }) =>
    h.error
      ? { data: undefined, isLoading: false, isError: true, isFetching: false, refetch: h.refetch }
      : f.estado === 'pendiente' && !f.tipo && h.pendientes.length
        ? { data: h.pendientes, isLoading: false, isError: false, isFetching: false, refetch: h.refetch }
        : { data: h.lista, isLoading: false, isError: false, isFetching: false, refetch: h.refetch },
}));
// El detalle y el formulario tienen sus propios tests: acá importa el panel.
vi.mock('@/features/seguridad/detalle-reporte', () => ({ DetalleReporte: ({ reporte }: { reporte: { id: number } }) => <p>detalle #{reporte.id}</p> }));
vi.mock('@/features/seguridad/reporte-form', () => ({ ReporteForm: () => null }));
vi.mock('@/features/seguridad/calificar-reporte', async (original) => ({
  ...(await original<typeof import('@/features/seguridad/calificar-reporte')>()),
  CalificarReporte: ({ onHecho }: { onHecho?: () => void }) => (
    <button type="button" onClick={onHecho}>
      calificar
    </button>
  ),
}));

import PanelReportesPage from './page';

const fila = (id: number, estado = 'pendiente'): Partial<ReporteSeguridad> => ({
  id,
  tipo: 'aviso_riesgo',
  estado: estado as ReporteSeguridad['estado'],
  fechaReporte: '2026-10-06',
  enviadoEn: '2026-10-07T11:42:00Z',
  autor: { cuil: `20${id}`, nombre: `AUTOR ${id}` },
  contrato: { id: 2, codigo: 'K2', nombre: 'K2' },
  tarea: { id: 3, nombre: 'Conexión' },
  naturaleza: { id: 4, nombre: 'E.P.P' },
  motivoParalizacion: null,
  punto: null,
  alarma: false,
});

describe('Panel de reportes', () => {
  beforeEach(() => {
    h.params = new URLSearchParams();
    h.error = false;
    h.lista = [fila(1), fila(2, 'aprobado'), fila(3)];
    h.pendientes = [];
    h.replace.mockReset();
    h.refetch.mockReset();
  });

  it('al calificar pasa solo al siguiente pendiente', async () => {
    render(<PanelReportesPage />);
    await userEvent.click(screen.getByText('AUTOR 1'));
    expect(screen.getByText('detalle #1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'calificar' }));
    expect(screen.getByText('detalle #3')).toBeInTheDocument();
  });

  it('↑/↓ cambian de reporte solo con el foco en la lista; en la ventana siguen scrolleando', async () => {
    render(<PanelReportesPage />);
    // En la ventana, las flechas no se tocan (no hay preventDefault ni cambio).
    const evento = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(false);
    expect(screen.queryByText(/detalle #/)).not.toBeInTheDocument();

    const filas = screen.getAllByRole('row').slice(1);
    // Un solo punto de tabulación para toda la lista.
    expect(filas.filter((f) => f.tabIndex === 0)).toHaveLength(1);
    filas[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByText('detalle #2')).toBeInTheDocument();
    expect(filas[1]).toHaveFocus();
    expect(filas[1]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByText('detalle #1')).toBeInTheDocument();
    fireEvent.keyDown(filas[0], { key: 'End' });
    expect(screen.getByText('detalle #3')).toBeInTheDocument();
  });

  it('el chip Pendientes muestra cuántos quedan aunque se mire otro estado', () => {
    h.params = new URLSearchParams('estado=aprobado');
    h.pendientes = [fila(1), fila(3), fila(4)];
    render(<PanelReportesPage />);
    expect(screen.getByRole('button', { name: /Pendientes/ })).toHaveTextContent('3');
    expect(screen.getByLabelText('3 sin calificar')).toBeInTheDocument();
  });

  it('Limpiar filtros vuelve a la bandeja de pendientes y solo aparece si hay filtros', async () => {
    const { unmount } = render(<PanelReportesPage />);
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
    unmount();
    h.params = new URLSearchParams('tipo=incidente&desde=2026-01-01');
    render(<PanelReportesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(h.replace).toHaveBeenCalledWith('/seguridad/panel', { scroll: false });
  });

  it('un error de carga dice qué falló y deja reintentar (no "no hay reportes")', async () => {
    h.error = true;
    render(<PanelReportesPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar los reportes');
    expect(screen.queryByText(/No hay reportes/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(h.refetch).toHaveBeenCalled();
  });

  it('los filtros se escriben en la URL', async () => {
    render(<PanelReportesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Aprobados' }));
    expect(h.replace).toHaveBeenCalledWith('/seguridad/panel?estado=aprobado', { scroll: false });
  });

  it('HyS crea la inspección con el tipo ya elegido', () => {
    render(<PanelReportesPage />);
    expect(screen.getByRole('link', { name: 'Nueva inspección' })).toHaveAttribute('href', '/seguridad/nuevo?tipo=inspeccion');
  });
});
