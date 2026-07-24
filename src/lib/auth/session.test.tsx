import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider, useSession } from './session';
import * as authApi from '@/lib/api/auth';

const PERFIL_FAKE = {
  cuil: '20123456789',
  email: 'op@empresa.com',
  activo: true,
  rol: { nombre: 'Operario' as const },
  empleado: { apellido_nombre: 'PEREZ JUAN', legajo: 10, cargo: 'Oficial' },
  contratosHabilitados: [],
  tiposNovedadHabilitados: [],
};

function Probe() {
  const { perfil, signIn, signOut } = useSession();
  return (
    <div>
      <span data-testid="nombre">{perfil?.empleado.apellido_nombre ?? 'sin-sesion'}</span>
      <button onClick={() => signIn('op@empresa.com', 'secret12')}>login</button>
      <button onClick={() => signOut()}>logout</button>
    </div>
  );
}

describe('SessionProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('signIn guarda token y carga el perfil', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ access_token: 'tok-1' });
    vi.spyOn(authApi, 'fetchPerfil').mockResolvedValue(PERFIL_FAKE);

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    expect(screen.getByTestId('nombre')).toHaveTextContent('sin-sesion');
    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('nombre')).toHaveTextContent('PEREZ JUAN'));
    expect(window.localStorage.getItem('sth_token')).toBe('tok-1');
  });

  it('signOut limpia el perfil y el token', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ access_token: 'tok-1' });
    vi.spyOn(authApi, 'fetchPerfil').mockResolvedValue(PERFIL_FAKE);

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('nombre')).toHaveTextContent('PEREZ JUAN'));

    await userEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('nombre')).toHaveTextContent('sin-sesion'));
    expect(window.localStorage.getItem('sth_token')).toBeNull();
  });
});
