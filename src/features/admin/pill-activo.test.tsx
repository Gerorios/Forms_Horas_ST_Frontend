import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PillActivo } from './pill-activo';

// Hotfix 2026-10-07 (revisión de diseño A1): la pastilla se ve como una
// etiqueta, pero cambiaba el estado con un solo clic. Ahora el clic pide
// confirmación y recién al confirmar se llama a onToggle.
describe('PillActivo', () => {
  it('un clic en "Activo" no desactiva: abre una confirmación', async () => {
    const onToggle = vi.fn();
    render(<PillActivo activo onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /activo/i }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('la confirmación nombra el registro y el efecto, y "Desactivar" llama a onToggle', async () => {
    const onToggle = vi.fn();
    render(
      <PillActivo
        activo
        onToggle={onToggle}
        nombre="SALAS MARIA JOSE"
        efecto="No va a poder entrar al sistema."
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /activo/i }));
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('SALAS MARIA JOSE');
    expect(dialogo).toHaveTextContent('No va a poder entrar al sistema.');
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('"Cancelar" cierra sin cambiar el estado', async () => {
    const onToggle = vi.fn();
    render(<PillActivo activo onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /activo/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('desde "Inactivo" también confirma, con el verbo "Activar"', async () => {
    const onToggle = vi.fn();
    render(<PillActivo activo={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /inactivo/i }));
    expect(onToggle).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
