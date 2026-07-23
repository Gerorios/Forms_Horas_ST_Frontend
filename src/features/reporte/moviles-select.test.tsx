import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MovilesSelect } from './moviles-select';

const MOVILES = [
  { id: 1, identificador: 'M-01', descripcion: null },
  { id: 2, identificador: 'M-02', descripcion: null },
];

describe('MovilesSelect', () => {
  it('sin selección, el disparador dice "Buscar móvil…"', () => {
    render(<MovilesSelect moviles={MOVILES} value={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Buscar móvil…')).toBeInTheDocument();
  });

  it('con selección, el disparador muestra la cantidad', () => {
    render(<MovilesSelect moviles={MOVILES} value={[1]} onChange={vi.fn()} />);
    expect(screen.getByText('1 móvil(es) seleccionado(s)')).toBeInTheDocument();
  });

  it('los seleccionados aparecen como chips debajo, sin abrir el buscador', () => {
    render(<MovilesSelect moviles={MOVILES} value={[1, 2]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /M-01/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /M-02/ })).toBeInTheDocument();
  });

  it('abre el buscador, filtra al tipear y seleccionar llama a onChange', async () => {
    const onChange = vi.fn();
    render(<MovilesSelect moviles={MOVILES} value={[]} onChange={onChange} />);
    await userEvent.click(screen.getByText('Buscar móvil…'));
    await userEvent.type(screen.getByPlaceholderText(/buscar por identificador/i), 'M-01');

    expect(screen.getByText('M-01')).toBeInTheDocument();
    expect(screen.queryByText('M-02')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('M-01'));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it('seleccionar varios seguidos no cierra el buscador', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<MovilesSelect moviles={MOVILES} value={[]} onChange={onChange} />);
    await userEvent.click(screen.getByText('Buscar móvil…'));
    await userEvent.click(screen.getByText('M-01'));
    expect(onChange).toHaveBeenCalledWith([1]);

    // Simula que el padre actualizó `value` tras la primera selección.
    rerender(<MovilesSelect moviles={MOVILES} value={[1]} onChange={onChange} />);
    expect(screen.getByText('M-02')).toBeInTheDocument();
    await userEvent.click(screen.getByText('M-02'));
    expect(onChange).toHaveBeenCalledWith([1, 2]);
  });

  it('sacar un chip llama a onChange sin ese id', async () => {
    const onChange = vi.fn();
    render(<MovilesSelect moviles={MOVILES} value={[1, 2]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /M-01/ }));
    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it('sin móviles cargados, muestra el mensaje en vez del buscador', () => {
    render(<MovilesSelect moviles={[]} value={[]} onChange={vi.fn()} />);
    expect(screen.getByText('No hay móviles cargados.')).toBeInTheDocument();
  });
});
