import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineasField } from './lineas-field';
import * as catApi from '@/lib/api/catalogos';

const CONTRATOS = [{ id: 1, codigo: 'K5', nombre: 'Contrato K5' }];

describe('LineasField', () => {
  it('agrega una línea al hacer click en "Agregar línea"', async () => {
    vi.spyOn(catApi, 'useTareas').mockReturnValue({ data: [] } as never);
    const onChange = vi.fn();
    render(
      <LineasField
        contratos={CONTRATOS}
        value={[{ contratoId: null, tareaId: null, horas: null }]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /agregar línea/i }));
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0][0];
    expect(arg).toHaveLength(2);
  });

  it('el select de tarea está deshabilitado sin contrato elegido', () => {
    vi.spyOn(catApi, 'useTareas').mockReturnValue({ data: [] } as never);
    render(
      <LineasField
        contratos={CONTRATOS}
        value={[{ contratoId: null, tareaId: null, horas: null }]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText(/tarea/i)).toBeDisabled();
  });
});
