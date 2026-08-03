import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FiltrosRegistros, type FiltrosRegistrosOpciones } from './filtros-registros';

const OPCIONES: FiltrosRegistrosOpciones = {
  contratos: [
    { id: 1, codigo: 'K5' },
    { id: 2, codigo: 'K8' },
  ],
  cargadores: [{ cuil: '20222222222', nombre: 'JEFE CUADRILLA' }],
  operarios: [{ cuil: '20111111111', apellido_nombre: 'PEREZ' }],
};

describe('FiltrosRegistros', () => {
  it('lista las opciones de contrato, cargador y operario recibidas', () => {
    render(<FiltrosRegistros value={{}} onChange={vi.fn()} opciones={OPCIONES} />);
    expect(screen.getByRole('option', { name: 'K5' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'K8' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'JEFE CUADRILLA' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'PEREZ' })).toBeInTheDocument();
  });

  it('elegir un contrato llama a onChange con el contratoId como número', async () => {
    const onChange = vi.fn();
    render(<FiltrosRegistros value={{}} onChange={onChange} opciones={OPCIONES} />);
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por contrato'), 'K8');
    expect(onChange).toHaveBeenCalledWith({ contratoId: 2 });
  });

  it('elegir un cargador llama a onChange con el cuil', async () => {
    const onChange = vi.fn();
    render(<FiltrosRegistros value={{}} onChange={onChange} opciones={OPCIONES} />);
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por quién cargó'), 'JEFE CUADRILLA');
    expect(onChange).toHaveBeenCalledWith({ cargadoPorCuil: '20222222222' });
  });

  it('sin ningún filtro activo, no muestra "Limpiar filtros"', () => {
    render(<FiltrosRegistros value={{}} onChange={vi.fn()} opciones={OPCIONES} />);
    expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument();
  });

  it('con un filtro activo, "Limpiar filtros" resetea todo a vacío', async () => {
    const onChange = vi.fn();
    render(<FiltrosRegistros value={{ contratoId: 1 }} onChange={onChange} opciones={OPCIONES} />);
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
