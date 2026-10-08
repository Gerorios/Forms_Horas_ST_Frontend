import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { EmpleadoBusqueda } from '@/types/domain';

const h = vi.hoisted(() => ({
  busqueda: { data: undefined as unknown, isError: false, refetch: vi.fn() },
}));
vi.mock('@/lib/api/empleados', () => ({ useBuscarEmpleados: () => h.busqueda }));

import { PersonasSelect } from './personas-select';

const PEREZ: EmpleadoBusqueda = { cuil: '20111', apellido_nombre: 'PEREZ JUAN', legajo: 101, cargo: 'OFICIAL' };
const GOMEZ: EmpleadoBusqueda = { cuil: '20222', apellido_nombre: 'GOMEZ LUIS', legajo: 202, cargo: 'AYUDANTE' };

function Probar({ inicial = [], max }: { inicial?: EmpleadoBusqueda[]; max?: number }) {
  const [v, setV] = useState(inicial);
  return <PersonasSelect id="personas" label="Personas observadas" ayuda="Cada una pierde puntos." value={v} onChange={setV} max={max} />;
}

describe('PersonasSelect', () => {
  beforeEach(() => {
    h.busqueda = { data: [PEREZ, GOMEZ], isError: false, refetch: vi.fn() };
  });

  it('el campo tiene rótulo y ayuda asociados', () => {
    render(<Probar />);
    const campo = screen.getByRole('combobox', { name: 'Personas observadas' });
    expect(campo).toHaveAccessibleDescription(/Cada una pierde puntos/);
  });

  it('pide 3 letras, avisa mientras busca y cuando no hay coincidencias', async () => {
    h.busqueda = { data: undefined, isError: false, refetch: vi.fn() };
    const { rerender } = render(<Probar />);
    await userEvent.type(screen.getByRole('combobox'), 'pe');
    expect(screen.getByRole('status')).toHaveTextContent('Escribí al menos 3 letras');
    await userEvent.type(screen.getByRole('combobox'), 'r');
    expect(screen.getByRole('status')).toHaveTextContent('Buscando…');
    h.busqueda = { data: [], isError: false, refetch: vi.fn() };
    rerender(<Probar />);
    expect(screen.getByRole('status')).toHaveTextContent('Sin coincidencias para “per”');
  });

  it('un error de búsqueda deja reintentar', async () => {
    h.busqueda = { data: undefined, isError: true, refetch: vi.fn() };
    render(<Probar />);
    await userEvent.type(screen.getByRole('combobox'), 'per');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(h.busqueda.refetch).toHaveBeenCalled();
  });

  it('se elige con el teclado y la ficha muestra nombre y legajo, con quitar de 44 px', async () => {
    render(<Probar />);
    await userEvent.type(screen.getByRole('combobox'), 'per');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    const elegidas = screen.getByRole('list', { name: 'Personas elegidas' });
    expect(elegidas).toHaveTextContent('GOMEZ LUIS · leg. 202');
    const quitar = screen.getByRole('button', { name: 'Quitar GOMEZ LUIS' });
    expect(quitar.className).toContain('h-11');
    await userEvent.click(quitar);
    expect(screen.queryByRole('list', { name: 'Personas elegidas' })).not.toBeInTheDocument();
  });

  it('no ofrece a quien ya está elegido', async () => {
    render(<Probar inicial={[PEREZ]} />);
    await userEvent.type(screen.getByRole('combobox'), 'per');
    expect(screen.queryByRole('option', { name: /PEREZ JUAN/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /GOMEZ LUIS/ })).toBeInTheDocument();
  });

  it('con max 1, elegir otra persona la reemplaza', async () => {
    render(<Probar inicial={[PEREZ]} max={1} />);
    await userEvent.type(screen.getByRole('combobox'), 'gom');
    await userEvent.click(screen.getByRole('option', { name: /GOMEZ LUIS/ }));
    const elegidas = screen.getByRole('list', { name: 'Personas elegidas' });
    expect(elegidas).toHaveTextContent('GOMEZ LUIS');
    expect(elegidas).not.toHaveTextContent('PEREZ JUAN');
  });
});
