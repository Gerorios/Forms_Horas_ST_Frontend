import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineasField } from './lineas-field';
import * as catApi from '@/lib/api/catalogos';

const CONTRATOS = [{ id: 1, codigo: 'K5', nombre: 'Contrato K5' }];

describe('LineasField', () => {
  it('agrega una línea con "Agregar contrato"', async () => {
    vi.spyOn(catApi, 'useTareas').mockReturnValue({ data: [] } as never);
    const onChange = vi.fn();
    render(
      <LineasField
        contratos={CONTRATOS}
        value={[{ contratoId: null, horas: null, tareaIds: [] }]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /agregar contrato/i }));
    expect(onChange.mock.calls[0][0]).toHaveLength(2);
  });

  it('sin contrato pide elegir uno antes de mostrar tareas', () => {
    vi.spyOn(catApi, 'useTareas').mockReturnValue({ data: [] } as never);
    render(
      <LineasField
        contratos={CONTRATOS}
        value={[{ contratoId: null, horas: null, tareaIds: [] }]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/elegí un contrato/i)).toBeInTheDocument();
  });

  it('con contrato elegido muestra las tareas como chips seleccionables', () => {
    vi.spyOn(catApi, 'useTareas').mockReturnValue({ data: [{ id: 9, nombre: 'Excavación' }] } as never);
    render(
      <LineasField
        contratos={CONTRATOS}
        value={[{ contratoId: 1, horas: 8, tareaIds: [] }]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Excavación' })).toBeInTheDocument();
  });
});
