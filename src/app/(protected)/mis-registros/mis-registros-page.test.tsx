import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function reg(id: number, fecha: string, horas: string, apellido = 'X', estado = 'aprobado') {
  return {
    id, loteId: `lote-${id}`, fecha, horas, estado, alertaHoras: false, motivoDesaprobacion: null,
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

/** Fuerza la quincena a Julio 2026, 1ª — independiente de la fecha real del día que corre el test. */
async function irAJulio1ra2026() {
  await userEvent.selectOptions(screen.getByLabelText('Mes'), '7');
  await userEvent.clear(screen.getByLabelText('Año'));
  await userEvent.type(screen.getByLabelText('Año'), '2026');
  await userEvent.selectOptions(screen.getByLabelText('Quincena'), '1');
}

describe('MisRegistrosPage', () => {
  beforeEach(() => {
    h.perfil = { cuil: '20111', rol: { nombre: 'Operario' } };
    h.mias = [reg(1, '2026-07-10', '8'), reg(2, '2026-07-20', '5')];
    h.cargadas = [];
  });

  it('Operario: muestra sus registros de la quincena seleccionada y NO ve pestañas', async () => {
    render(<MisRegistrosPage />);
    await irAJulio1ra2026();
    expect(screen.getByText(/Excavación/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cargas que hice/i })).toBeNull();
  });

  it('JefeCuadrilla: ve dos pestañas y "Cargas que hice" muestra al operario cargado', async () => {
    h.perfil = { cuil: '20111', rol: { nombre: 'JefeCuadrilla' } };
    h.cargadas = [reg(3, '2026-07-05', '7', 'GOMEZ SEGUNDO ALBERTO')];
    render(<MisRegistrosPage />);
    expect(screen.getByRole('button', { name: /mis horas/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cargas que hice/i }));
    await irAJulio1ra2026();
    expect(screen.getByText('GOMEZ SEGUNDO ALBERTO')).toBeInTheDocument();
  });
});
