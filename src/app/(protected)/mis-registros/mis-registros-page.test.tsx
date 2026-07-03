import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function reg(id: number, fecha: string, horas: string, apellido = 'X', estado = 'aprobado') {
  return {
    id, fecha, horas, estado, alertaHoras: false, motivoDesaprobacion: null,
    operario: { cuil: '20111', apellido_nombre: apellido },
    contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
    tareas: [{ tarea: { id: 9, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [],
  };
}

const h = vi.hoisted(() => ({
  perfil: { cuil: '20111', rol: { nombre: 'Operario' } } as { cuil: string; rol: { nombre: string } },
  mias: [] as ReturnType<typeof reg>[],
  cargadas: [] as ReturnType<typeof reg>[],
}));

vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ perfil: h.perfil }) }));
vi.mock('@/lib/api/registros', () => ({
  useMisRegistros: () => ({ data: h.mias, isLoading: false }),
  useCargasQueHice: () => ({ data: h.cargadas, isLoading: false }),
}));

import MisRegistrosPage from './page';

describe('MisRegistrosPage', () => {
  beforeEach(() => {
    h.perfil = { cuil: '20111', rol: { nombre: 'Operario' } };
    h.mias = [reg(1, '2026-07-10', '8'), reg(2, '2026-07-20', '5')];
    h.cargadas = [];
  });

  it('Operario: muestra sus registros de la quincena y NO ve pestañas', () => {
    render(<MisRegistrosPage />);
    expect(screen.getByText('Excavación')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cargas que hice/i })).toBeNull();
  });

  it('JefeCuadrilla: ve dos pestañas y "Cargas que hice" muestra al operario cargado', async () => {
    h.perfil = { cuil: '20111', rol: { nombre: 'JefeCuadrilla' } };
    h.cargadas = [reg(3, '2026-07-05', '7', 'GOMEZ SEGUNDO ALBERTO')];
    render(<MisRegistrosPage />);
    expect(screen.getByRole('button', { name: /mis horas/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cargas que hice/i }));
    expect(screen.getByText('GOMEZ SEGUNDO ALBERTO')).toBeInTheDocument();
  });
});
