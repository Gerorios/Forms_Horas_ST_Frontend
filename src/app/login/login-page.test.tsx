import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const signInMock = vi.fn();
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ signIn: signInMock }) }));

import LoginPage from './page';

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInMock.mockReset();
  });

  it('muestra error de validación con email inválido', async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'no-es-email');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('con datos válidos llama signIn y redirige a /', async () => {
    signInMock.mockResolvedValue(undefined);
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'op@empresa.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    await waitFor(() => expect(signInMock).toHaveBeenCalledWith('op@empresa.com', 'secret12'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('muestra "Credenciales inválidas" si signIn rechaza', async () => {
    signInMock.mockRejectedValue(new Error('401'));
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'op@empresa.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(await screen.findByText(/credenciales inválidas/i)).toBeInTheDocument();
  });
});
