import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mutateAsync = vi.fn().mockResolvedValue({ creados: 1, registros: [] });

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
  useMoviles: () => ({ data: [] }),
  useTareas: () => ({ data: [{ id: 9, nombre: 'Excavación' }] }),
}));
vi.mock('@/lib/api/registros', () => ({ useCrearReporteBatch: () => ({ mutateAsync, isPending: false }) }));
vi.mock('@/lib/api/empleados', () => ({
  useBuscarEmpleados: () => ({ data: [{ cuil: '20169', apellido_nombre: 'GOMEZ', legajo: 1, cargo: 'OF' }] }),
}));
vi.mock('@/features/reporte/use-geolocation', () => ({ useGeolocation: () => ({ estado: 'denegado', coords: null }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() } }));

import ReportePage from './page';

describe('ReportePage', () => {
  beforeEach(() => mutateAsync.mockClear());

  it('no envía si no hay operarios ni líneas completas', () => {
    render(<ReportePage />);
    expect(screen.getByRole('button', { name: /reportar/i })).toBeDisabled();
  });

  it('con 1 operario y 1 línea completa envía el batch', async () => {
    render(<ReportePage />);
    // elegir operario
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    // completar línea: contrato, tarea (chip) y horas
    await userEvent.selectOptions(screen.getByLabelText('Contrato'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Excavación' }));
    await userEvent.type(screen.getByLabelText('Horas'), '8');
    // enviar y confirmar
    await userEvent.click(screen.getByRole('button', { name: /reportar/i }));
    await userEvent.click(await screen.findByRole('button', { name: /confirmar/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.operarioCuils).toEqual(['20169']);
    expect(payload.lineas).toEqual([{ contratoId: 1, horas: 8, tareaIds: [9] }]);
    expect(payload.provinciaId).toBe(1);
  });
});
