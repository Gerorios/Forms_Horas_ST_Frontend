import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeriodoForm } from './periodo-form';

describe('PeriodoForm', () => {
  it('manda nombre y rango', async () => {
    const onGuardar = vi.fn();
    render(<PeriodoForm enviando={false} onGuardar={onGuardar} textoBoton="Crear período" />);
    await userEvent.type(screen.getByLabelText('Nombre'), '1er semestre 2027');
    await userEvent.type(screen.getByLabelText('Desde'), '2027-01-01');
    await userEvent.type(screen.getByLabelText('Hasta'), '2027-06-30');
    await userEvent.click(screen.getByRole('button', { name: 'Crear período' }));
    expect(onGuardar).toHaveBeenCalledWith({ nombre: '1er semestre 2027', desde: '2027-01-01', hasta: '2027-06-30' });
  });

  it('no deja guardar un período que termina antes de empezar', async () => {
    render(<PeriodoForm enviando={false} onGuardar={vi.fn()} textoBoton="Crear período" />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Mal');
    await userEvent.type(screen.getByLabelText('Desde'), '2027-06-30');
    await userEvent.type(screen.getByLabelText('Hasta'), '2027-01-01');
    expect(screen.getByRole('alert')).toHaveTextContent('termina antes de empezar');
    expect(screen.getByRole('button', { name: 'Crear período' })).toBeDisabled();
  });
});
