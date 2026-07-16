import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const crear = vi.fn().mockResolvedValue({});
const editar = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/admin', () => ({
  useContratosAdmin: () => ({
    data: [{ id: 1, codigo: 'K5', nombre: 'Contrato K5', activo: true, jefeContratoCuil: null, jefeContrato: null }],
    isLoading: false,
  }),
  useUsuariosAdmin: () => ({
    data: [
      {
        cuil: '20111111111', email: 'jefe1@serytec.com', activo: true, rolId: 3,
        rol: { nombre: 'JefeContrato' }, empleado: { apellido_nombre: 'PEREZ JUAN' },
        contratosHabilitados: [],
      },
      {
        cuil: '20999999999', email: 'operario@st.local', activo: true, rolId: 1,
        rol: { nombre: 'Operario' }, empleado: { apellido_nombre: 'OTRO OPERARIO' },
        contratosHabilitados: [],
      },
    ],
  }),
  useCrearContrato: () => ({ mutateAsync: crear, isPending: false }),
  useEditarContrato: () => ({ mutateAsync: editar, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

import ContratosAdminPage from './page';

describe('ContratosAdminPage', () => {
  beforeEach(() => { crear.mockClear(); editar.mockClear(); });

  it('el selector de Jefe de Contrato solo lista usuarios con rol JefeContrato', async () => {
    render(<ContratosAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('option', { name: /PEREZ JUAN/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /OTRO OPERARIO/ })).not.toBeInTheDocument();
  });

  it('asignar un jefe desde la página llama al mutate con el cuil correcto', async () => {
    render(<ContratosAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.selectOptions(screen.getByLabelText('Jefe de Contrato'), '20111111111');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith({ id: 1, jefeContratoCuil: '20111111111' }));
  });
});
