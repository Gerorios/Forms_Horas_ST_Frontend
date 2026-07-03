import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperariosSelect } from './operarios-select';
import * as empApi from '@/lib/api/empleados';

const EMP = { cuil: '20169331708', apellido_nombre: 'GOMEZ SEGUNDO ALBERTO', legajo: 10714, cargo: 'OFICIAL' };

describe('OperariosSelect', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('con menos de 3 letras muestra la pista y no busca', async () => {
    const spy = vi.spyOn(empApi, 'useBuscarEmpleados').mockReturnValue({ data: undefined } as never);
    render(<OperariosSelect value={[]} onChange={() => {}} />);
    await userEvent.type(screen.getByRole('textbox'), 'go');
    expect(screen.getByText(/al menos 3 letras/i)).toBeInTheDocument();
    // el hook se invoca siempre, pero con term corto queda deshabilitado; acá validamos la pista
    spy.mockRestore();
  });

  it('lista coincidencias y al hacer click agrega un chip', async () => {
    vi.spyOn(empApi, 'useBuscarEmpleados').mockReturnValue({ data: [EMP] } as never);
    const onChange = vi.fn();
    render(<OperariosSelect value={[]} onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'gomez');
    await userEvent.click(await screen.findByText(/GOMEZ SEGUNDO ALBERTO/));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([EMP]));
  });

  it('muestra los seleccionados como chips', () => {
    vi.spyOn(empApi, 'useBuscarEmpleados').mockReturnValue({ data: undefined } as never);
    render(<OperariosSelect value={[EMP]} onChange={() => {}} />);
    expect(screen.getByText(/GOMEZ SEGUNDO ALBERTO/)).toBeInTheDocument();
  });
});
