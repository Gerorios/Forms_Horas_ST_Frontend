import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mutateAsync = vi.fn().mockResolvedValue({
  creados: [{ cuil: '20169', apellido_nombre: 'GOMEZ', email: '10714@st.local', password: 'Ab12Cd34Ef' }],
  omitidos: [],
});

vi.mock('@/lib/api/admin', () => ({ useCrearUsuariosMasivo: () => ({ mutateAsync, isPending: false }) }));
vi.mock('@/lib/api/empleados', () => ({
  useBuscarEmpleados: () => ({ data: [{ cuil: '20169', apellido_nombre: 'GOMEZ', legajo: 10714, cargo: 'OF' }] }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import { AltaMasiva } from './alta-masiva';

describe('AltaMasiva', () => {
  beforeEach(() => mutateAsync.mockClear());

  it('genera usuarios y muestra las credenciales', async () => {
    render(<AltaMasiva onListo={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar operario/i), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ/));
    await userEvent.click(screen.getByRole('button', { name: /generar usuarios/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(['20169']));
    expect(await screen.findByText('10714@st.local')).toBeInTheDocument();
    expect(screen.getByText('Ab12Cd34Ef')).toBeInTheDocument();
  });
});
