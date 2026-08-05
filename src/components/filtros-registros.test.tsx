import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FiltrosRegistros, type FiltrosRegistrosOpciones } from './filtros-registros';

const OPCIONES: FiltrosRegistrosOpciones = {
  contratos: [
    { value: '1', label: 'K5', count: 3 },
    { value: '2', label: 'K8', count: 1 },
  ],
  cargadores: [{ value: '20222222222', label: 'JEFE CUADRILLA', count: 4 }],
  operarios: [{ value: '20111111111', label: 'PEREZ', count: 2 }],
};

describe('FiltrosRegistros', () => {
  it('lista las opciones de contrato, cargador y operario recibidas', async () => {
    render(<FiltrosRegistros value={{}} onChange={vi.fn()} opciones={OPCIONES} />);
    await userEvent.click(screen.getByLabelText('Filtrar por contrato'));
    expect(screen.getByLabelText('K5')).toBeInTheDocument();
    expect(screen.getByLabelText('K8')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Filtrar por quién cargó'));
    expect(screen.getByLabelText('JEFE CUADRILLA')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Filtrar por operario'));
    expect(screen.getByLabelText('PEREZ')).toBeInTheDocument();
  });

  it('tildar un contrato llama a onChange con el contratoId como string', async () => {
    const onChange = vi.fn();
    render(<FiltrosRegistros value={{}} onChange={onChange} opciones={OPCIONES} />);
    await userEvent.click(screen.getByLabelText('Filtrar por contrato'));
    await userEvent.click(screen.getByLabelText('K8'));
    expect(onChange).toHaveBeenCalledWith({ contratoIds: ['2'] });
  });

  it('tildar un cargador llama a onChange con el cuil', async () => {
    const onChange = vi.fn();
    render(<FiltrosRegistros value={{}} onChange={onChange} opciones={OPCIONES} />);
    await userEvent.click(screen.getByLabelText('Filtrar por quién cargó'));
    await userEvent.click(screen.getByLabelText('JEFE CUADRILLA'));
    expect(onChange).toHaveBeenCalledWith({ cargadoPorCuils: ['20222222222'] });
  });

  it('permite tildar más de un operario a la vez (multi-selección)', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<FiltrosRegistros value={{}} onChange={onChange} opciones={OPCIONES} />);
    await userEvent.click(screen.getByLabelText('Filtrar por operario'));
    await userEvent.click(screen.getByLabelText('PEREZ'));
    expect(onChange).toHaveBeenLastCalledWith({ operarioCuils: ['20111111111'] });

    rerender(
      <FiltrosRegistros
        value={{ operarioCuils: ['20111111111'] }}
        onChange={onChange}
        opciones={{
          ...OPCIONES,
          operarios: [...OPCIONES.operarios, { value: '20333333333', label: 'GOMEZ', count: 1 }],
        }}
      />,
    );
    await userEvent.click(screen.getByLabelText('GOMEZ'));
    expect(onChange).toHaveBeenLastCalledWith({ operarioCuils: ['20111111111', '20333333333'] });
  });

  it('sin ningún filtro activo, no muestra "Limpiar filtros"', () => {
    render(<FiltrosRegistros value={{}} onChange={vi.fn()} opciones={OPCIONES} />);
    expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument();
  });

  it('con un filtro activo, "Limpiar filtros" resetea todo a vacío', async () => {
    const onChange = vi.fn();
    render(<FiltrosRegistros value={{ contratoIds: ['1'] }} onChange={onChange} opciones={OPCIONES} />);
    await userEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('elegir una fecha llama a onChange con el string de fecha', async () => {
    const onChange = vi.fn();
    render(<FiltrosRegistros value={{}} onChange={onChange} opciones={OPCIONES} />);
    await userEvent.type(screen.getByLabelText('Filtrar por fecha'), '2026-07-10');
    expect(onChange).toHaveBeenLastCalledWith({ fecha: '2026-07-10' });
  });
});
