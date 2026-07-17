import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MovilesSelect } from './moviles-select';

const MOVILES = [
  { id: 1, identificador: 'M-01', descripcion: null },
  { id: 2, identificador: 'M-02', descripcion: null },
];

describe('MovilesSelect', () => {
  it('cerrado por default, muestra "Móviles ▾" sin selección', () => {
    render(<MovilesSelect moviles={MOVILES} value={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Móviles ▾' })).toBeInTheDocument();
    expect(screen.queryByText('M-01')).not.toBeInTheDocument();
  });

  it('muestra la cantidad seleccionada en el botón', () => {
    render(<MovilesSelect moviles={MOVILES} value={[1]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /1 seleccionados/i })).toBeInTheDocument();
  });

  it('al abrir, tildar un móvil llama onChange con el id agregado', async () => {
    const onChange = vi.fn();
    render(<MovilesSelect moviles={MOVILES} value={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /móviles/i }));
    await userEvent.click(screen.getByText('M-01'));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it('destildar un móvil ya seleccionado llama onChange sin ese id', async () => {
    const onChange = vi.fn();
    render(<MovilesSelect moviles={MOVILES} value={[1, 2]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /móviles/i }));
    await userEvent.click(screen.getByText('M-01'));
    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it('click afuera cierra el desplegable', async () => {
    render(
      <div>
        <MovilesSelect moviles={MOVILES} value={[]} onChange={vi.fn()} />
        <button type="button">afuera</button>
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: /móviles/i }));
    expect(screen.getByText('M-01')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'afuera' }));
    expect(screen.queryByText('M-01')).not.toBeInTheDocument();
  });
});
