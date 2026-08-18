import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replaceMock = vi.fn();
const h = vi.hoisted(() => ({ perfil: null as { rol: { nombre: string } } | null }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ perfil: h.perfil }) }));

import NovedadesLayout from './layout';

describe('NovedadesLayout', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    h.perfil = null;
  });

  it('con un rol permitido (ej. JefeContrato), muestra el contenido y no redirige', () => {
    h.perfil = { rol: { nombre: 'JefeContrato' } };
    render(
      <NovedadesLayout>
        <p>contenido</p>
      </NovedadesLayout>,
    );
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('con un rol sin acceso (Operario), redirige a /403 y no muestra el contenido', () => {
    h.perfil = { rol: { nombre: 'Operario' } };
    render(
      <NovedadesLayout>
        <p>contenido</p>
      </NovedadesLayout>,
    );
    expect(screen.queryByText('contenido')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/403');
  });

  it('JefeCuadrilla sí tiene acceso (puede cargar y ver lo que cargó)', () => {
    h.perfil = { rol: { nombre: 'JefeCuadrilla' } };
    render(
      <NovedadesLayout>
        <p>contenido</p>
      </NovedadesLayout>,
    );
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
