import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetearPasswordDialog } from './resetear-password-dialog';

describe('ResetearPasswordDialog', () => {
  it('muestra el nombre y el cuil en el mensaje de confirmación', () => {
    render(
      <ResetearPasswordDialog apellidoNombre="TORRES RAMON" cuil="20111111111" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText(/TORRES RAMON/)).toBeInTheDocument();
    expect(screen.getByText(/20111111111/)).toBeInTheDocument();
  });

  it('confirmar llama a onConfirm', async () => {
    const onConfirm = vi.fn();
    render(
      <ResetearPasswordDialog apellidoNombre="TORRES RAMON" cuil="20111111111" onConfirm={onConfirm} onCancel={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancelar llama a onCancel sin llamar a onConfirm', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ResetearPasswordDialog apellidoNombre="TORRES RAMON" cuil="20111111111" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
