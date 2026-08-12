import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mutateAsync = vi.fn().mockResolvedValue({ creados: 1, registros: [] });
const h = vi.hoisted(() => ({ isPending: false }));

vi.mock('@/lib/auth/session', () => ({
  useSession: () => ({
    perfil: {
      cuil: '20111',
      rol: { nombre: 'Operario' },
      empleado: { apellido_nombre: 'X' },
      contratosHabilitados: [{ contrato: { id: 1, codigo: 'K5', nombre: 'K5' } }],
    },
  }),
}));
vi.mock('@/lib/api/catalogos', () => ({
  useProvincias: () => ({ data: [{ id: 1, nombre: 'Córdoba' }] }),
  useMoviles: () => ({ data: [{ id: 1, identificador: 'M-01', descripcion: null }] }),
  useTareas: () => ({ data: [{ id: 9, nombre: 'Excavación' }] }),
}));
vi.mock('@/lib/api/registros', () => ({
  useCrearReporteBatch: () => ({ mutateAsync, isPending: h.isPending }),
}));
vi.mock('@/lib/api/empleados', () => ({
  useBuscarEmpleados: () => ({ data: [{ cuil: '20169', apellido_nombre: 'GOMEZ', legajo: 1, cargo: 'OF' }] }),
}));
vi.mock('@/features/reporte/use-geolocation', () => ({ useGeolocation: () => ({ estado: 'denegado', coords: null }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() } }));

import ReportePage from './page';

describe('ReportePage', () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    h.isPending = false;
  });

  it('la fecha arranca VACÍA, sin default de hoy (decisión 2026-08-12)', () => {
    render(<ReportePage />);
    expect((screen.getByLabelText('Fecha') as HTMLInputElement).value).toBe('');
  });

  it('no envía si faltan campos obligatorios, y marca los errores al intentar', async () => {
    render(<ReportePage />);
    await userEvent.click(screen.getByRole('button', { name: /reportar/i }));
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText('Elegí la fecha del reporte.')).toBeInTheDocument();
    expect(screen.getByText('Elegí al menos un móvil.')).toBeInTheDocument();
    expect(screen.getByText('Agregá al menos un operario.')).toBeInTheDocument();
    expect(screen.getByText('Elegí un contrato.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá las horas.')).toBeInTheDocument();
    expect(screen.getByText('Agregá una descripción de la tarea.')).toBeInTheDocument();
  });

  it('con todo completo menos la fecha, NO envía', async () => {
    render(<ReportePage />);
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    await userEvent.click(screen.getByText('Buscar móvil…'));
    await userEvent.click(screen.getByText('M-01'));
    await userEvent.selectOptions(screen.getByLabelText('Contrato'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Excavación' }));
    await userEvent.type(screen.getByLabelText('Horas'), '8');
    await userEvent.type(screen.getByLabelText('Observación'), 'Tarea de excavación');
    await userEvent.click(screen.getByRole('button', { name: /reportar/i }));
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText('Elegí la fecha del reporte.')).toBeInTheDocument();
  });

  it('tras un envío exitoso, la fecha vuelve a vacío (hay que elegirla de nuevo)', async () => {
    render(<ReportePage />);
    await userEvent.type(screen.getByLabelText('Fecha'), '2026-08-11');
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    await userEvent.click(screen.getByText('Buscar móvil…'));
    await userEvent.click(screen.getByText('M-01'));
    await userEvent.selectOptions(screen.getByLabelText('Contrato'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Excavación' }));
    await userEvent.type(screen.getByLabelText('Horas'), '8');
    await userEvent.type(screen.getByLabelText('Observación'), 'Tarea de excavación');
    await userEvent.click(screen.getByRole('button', { name: /reportar/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByLabelText('Fecha') as HTMLInputElement).value).toBe(''));
  });

  it('con todos los campos completos (incluido móvil y observación) envía el batch', async () => {
    render(<ReportePage />);
    await userEvent.type(screen.getByLabelText('Fecha'), '2026-08-11');
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    await userEvent.click(screen.getByText('Buscar móvil…'));
    await userEvent.click(screen.getByText('M-01'));
    await userEvent.selectOptions(screen.getByLabelText('Contrato'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Excavación' }));
    await userEvent.type(screen.getByLabelText('Horas'), '8');
    await userEvent.type(screen.getByLabelText('Observación'), 'Tarea de excavación');
    await userEvent.click(screen.getByRole('button', { name: /reportar/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.operarioCuils).toEqual(['20169']);
    expect(payload.movilIds).toEqual([1]);
    expect(payload.lineas).toEqual([
      { contratoId: 1, horas: 8, tareaIds: [9], observacion: 'Tarea de excavación' },
    ]);
    expect(payload.provinciaId).toBe(1);
    expect(payload.fecha).toBe('2026-08-11');
  });

  it('muestra el modal de carga mientras la mutación está pendiente', () => {
    h.isPending = true;
    render(<ReportePage />);
    expect(screen.getByText('Cargando reporte…')).toBeInTheDocument();
  });

  it('el selector de móviles es un buscador con autocompletar, no una lista de chips fija', async () => {
    render(<ReportePage />);
    expect(screen.getByText('Buscar móvil…')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Buscar móvil…'));
    expect(screen.getByPlaceholderText(/buscar por identificador/i)).toBeInTheDocument();
    expect(screen.getByText('M-01')).toBeInTheDocument();
  });
});
