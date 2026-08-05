import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiFiltro } from './barra-filtros';

const OPCIONES_CHICAS = [
  { value: 'k5', label: 'K5', count: 3 },
  { value: 'k8', label: 'K8', count: 1 },
];

function opcionesGrandes(n: number) {
  return Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `Opción ${i}` }));
}

describe('MultiFiltro', () => {
  it('sin selección muestra solo el label en el trigger', () => {
    render(<MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Contrato' })).toHaveTextContent('Contrato');
    expect(screen.getByRole('button', { name: 'Contrato' })).not.toHaveTextContent('(0)');
  });

  it('con selección muestra el contador en el trigger', () => {
    render(
      <MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={['k5']} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Contrato' })).toHaveTextContent('Contrato (1)');
  });

  it('al abrir, lista las opciones con su count', async () => {
    render(<MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    expect(screen.getByLabelText('K5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('tildar una opción llama a onChange con esa opción agregada', async () => {
    const onChange = vi.fn();
    render(<MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    await userEvent.click(screen.getByLabelText('K5'));
    expect(onChange).toHaveBeenCalledWith(['k5']);
  });

  it('destildar una opción llama a onChange sin esa opción', async () => {
    const onChange = vi.fn();
    render(
      <MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={['k5', 'k8']} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    await userEvent.click(screen.getByLabelText('K5'));
    expect(onChange).toHaveBeenCalledWith(['k8']);
  });

  it('"(Todos)" con nada seleccionado no está marcado ni indeterminate', async () => {
    render(<MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    const todos = screen.getByLabelText('(Todos)') as HTMLInputElement;
    expect(todos.checked).toBe(false);
    expect(todos.indeterminate).toBe(false);
  });

  it('"(Todos)" con selección parcial queda indeterminate', async () => {
    render(
      <MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={['k5']} onChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    const todos = screen.getByLabelText('(Todos)') as HTMLInputElement;
    expect(todos.indeterminate).toBe(true);
  });

  it('click en "(Todos)" con selección parcial marca todas las visibles', async () => {
    const onChange = vi.fn();
    render(
      <MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={['k5']} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    await userEvent.click(screen.getByLabelText('(Todos)'));
    expect(onChange).toHaveBeenCalledWith(['k5', 'k8']);
  });

  it('click en "(Todos)" con todas seleccionadas las desmarca todas', async () => {
    const onChange = vi.fn();
    render(
      <MultiFiltro
        label="Contrato"
        opciones={OPCIONES_CHICAS}
        seleccionados={['k5', 'k8']}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    await userEvent.click(screen.getByLabelText('(Todos)'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('con 10 opciones o menos no muestra buscador interno', async () => {
    render(<MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    expect(screen.queryByPlaceholderText('Buscar…')).not.toBeInTheDocument();
  });

  it('con más de 10 opciones muestra buscador interno que filtra por label sin tildes/mayúsculas', async () => {
    const opciones = opcionesGrandes(12);
    render(<MultiFiltro label="Operario" opciones={opciones} seleccionados={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Operario' }));
    expect(screen.getByPlaceholderText('Buscar…')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('Buscar…'), 'ópCiÓn 1');
    expect(screen.getByLabelText('Opción 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Opción 2')).not.toBeInTheDocument();
    // "Opción 10", "Opción 11" también matchean "1" — solo importa que "Opción 2" quedó afuera.
  });

  it('"(Todos)" con buscador activo solo marca/desmarca las opciones visibles filtradas', async () => {
    const opciones = opcionesGrandes(12);
    const onChange = vi.fn();
    render(<MultiFiltro label="Operario" opciones={opciones} seleccionados={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Operario' }));
    await userEvent.type(screen.getByPlaceholderText('Buscar…'), 'Opción 0');
    await userEvent.click(screen.getByLabelText('(Todos)'));
    expect(onChange).toHaveBeenCalledWith(['v0']);
  });

  it('cierra el desplegable con Escape', async () => {
    render(<MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    expect(screen.getByLabelText('K5')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByLabelText('K5')).not.toBeInTheDocument();
  });

  it('cierra el desplegable al hacer click afuera', async () => {
    render(
      <div>
        <MultiFiltro label="Contrato" opciones={OPCIONES_CHICAS} seleccionados={[]} onChange={vi.fn()} />
        <button type="button">Afuera</button>
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    expect(screen.getByLabelText('K5')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Afuera' }));
    expect(screen.queryByLabelText('K5')).not.toBeInTheDocument();
  });

  it('sin opciones muestra "Sin opciones"', async () => {
    render(<MultiFiltro label="Contrato" opciones={[]} seleccionados={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Contrato' }));
    expect(screen.getByText('Sin opciones')).toBeInTheDocument();
  });
});
