import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ItemMaestroCarga } from '@/lib/api/certificaciones';
import { FilaManualForm } from './fila-manual-form';

const ITEMS: ItemMaestroCarga[] = [
  { id_item: 77, item_codigo: '5', codigo_k: 'K8', tarea: 'Adicional para servicios que superen los 3 metros', unidad_medida: 'UN' },
  { id_item: 78, item_codigo: '436', codigo_k: 'K8', tarea: 'Instalación de servicio en PE Dn 25 mm', unidad_medida: 'UN' },
];

const onAgregar = vi.fn();
const onCancelar = vi.fn();

beforeEach(() => {
  onAgregar.mockReset();
  onCancelar.mockReset();
});

function montar() {
  return render(
    <FilaManualForm items={ITEMS} provincias={['Salta', 'Jujuy']} onAgregar={onAgregar} onCancelar={onCancelar} />,
  );
}

describe('FilaManualForm', () => {
  it('solo ofrece los ítems del maestro que llegan por props (ya filtrados por tus contratos)', () => {
    montar();
    const select = screen.getByLabelText(/ítem del maestro/i);
    expect(select).toHaveTextContent('K8 · 5 · Adicional para servicios que superen los 3 metros');
    expect(select).toHaveTextContent('K8 · 436 · Instalación de servicio en PE Dn 25 mm');
    // Opciones = placeholder + los 2 ítems: nada tipeado a mano.
    expect(select.querySelectorAll('option')).toHaveLength(3);
  });

  it('propone el total como cantidad × unitario con 2 decimales y recalcula al tipear cualquiera de los dos', async () => {
    const user = userEvent.setup();
    montar();
    await user.type(screen.getByLabelText(/^cantidad$/i), '4');
    await user.type(screen.getByLabelText(/\$ unitario/i), '15151,96');
    expect(screen.getByLabelText(/^\$ total$/i)).toHaveValue('60607.84');

    await user.clear(screen.getByLabelText(/^cantidad$/i));
    await user.type(screen.getByLabelText(/^cantidad$/i), '2');
    expect(screen.getByLabelText(/^\$ total$/i)).toHaveValue('30303.92');
  });

  it('si el usuario toca el total, el propuesto deja de pisarlo', async () => {
    const user = userEvent.setup();
    montar();
    await user.type(screen.getByLabelText(/^cantidad$/i), '4');
    await user.type(screen.getByLabelText(/\$ unitario/i), '100');
    expect(screen.getByLabelText(/^\$ total$/i)).toHaveValue('400.00');

    await user.tripleClick(screen.getByLabelText(/^\$ total$/i));
    await user.keyboard('395,50');
    await user.type(screen.getByLabelText(/^cantidad$/i), '0');
    expect(screen.getByLabelText(/^\$ total$/i)).toHaveValue('395.50');
  });

  it('si el usuario borra el total del todo, vuelve a proponerse cantidad × unitario', async () => {
    const user = userEvent.setup();
    montar();
    await user.type(screen.getByLabelText(/^cantidad$/i), '4');
    await user.type(screen.getByLabelText(/\$ unitario/i), '100');
    expect(screen.getByLabelText(/^\$ total$/i)).toHaveValue('400.00');

    await user.tripleClick(screen.getByLabelText(/^\$ total$/i));
    await user.keyboard('395,50');
    expect(screen.getByLabelText(/^\$ total$/i)).toHaveValue('395.50');

    await user.clear(screen.getByLabelText(/^\$ total$/i));
    expect(screen.getByLabelText(/^\$ total$/i)).toHaveValue('400.00');
  });

  it('Agregar queda deshabilitado si el total quedó vacío', async () => {
    const user = userEvent.setup();
    montar();
    await user.selectOptions(screen.getByLabelText(/ítem del maestro/i), '77');
    await user.type(screen.getByLabelText(/^cantidad$/i), '4');
    await user.type(screen.getByLabelText(/\$ unitario/i), '100');
    expect(screen.getByRole('button', { name: /^agregar$/i })).toBeEnabled();

    await user.clear(screen.getByLabelText(/^\$ total$/i));
    await user.clear(screen.getByLabelText(/^cantidad$/i));
    expect(screen.getByLabelText(/^\$ total$/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /^agregar$/i })).toBeDisabled();
  });

  it('Agregar queda deshabilitado hasta tener ítem, provincia, cantidad y unitario', async () => {
    const user = userEvent.setup();
    montar();
    const agregar = screen.getByRole('button', { name: /^agregar$/i });
    expect(agregar).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/ítem del maestro/i), '77');
    expect(agregar).toBeDisabled();
    await user.type(screen.getByLabelText(/^cantidad$/i), '4');
    expect(agregar).toBeDisabled();
    await user.type(screen.getByLabelText(/\$ unitario/i), '15151,96');
    expect(agregar).toBeEnabled();
  });

  it('al agregar devuelve la fila manual normalizada más el ítem del maestro elegido', async () => {
    const user = userEvent.setup();
    montar();
    await user.selectOptions(screen.getByLabelText(/ítem del maestro/i), '77');
    await user.type(screen.getByLabelText(/^cantidad$/i), '4');
    await user.type(screen.getByLabelText(/\$ unitario/i), '15151,96');
    await user.click(screen.getByRole('button', { name: /^agregar$/i }));

    expect(onAgregar).toHaveBeenCalledWith({
      item: ITEMS[0],
      id_item: 77,
      provincia: 'Salta',
      cantidades: '4',
      precio_unitario: '15151.96',
      total_mes: '60607.84',
    });
  });

  it('acepta la cifra con punto de miles y coma decimal ("15.151,96")', async () => {
    const user = userEvent.setup();
    montar();
    await user.type(screen.getByLabelText(/^cantidad$/i), '4');
    await user.type(screen.getByLabelText(/\$ unitario/i), '15.151,96');
    expect(screen.getByLabelText(/\$ unitario/i)).toHaveValue('15151.96');
    expect(screen.getByLabelText(/^\$ total$/i)).toHaveValue('60607.84');
  });

  it('observaciones: opcional, tope de 500 y viaja solo si el usuario escribió algo', async () => {
    const user = userEvent.setup();
    montar();
    const obs = screen.getByLabelText(/observaciones/i);
    expect(obs).toHaveAttribute('maxLength', '500');

    await user.selectOptions(screen.getByLabelText(/ítem del maestro/i), '77');
    await user.type(screen.getByLabelText(/^cantidad$/i), '4');
    await user.type(screen.getByLabelText(/\$ unitario/i), '100');
    // Sin observaciones: la clave no aparece en el payload.
    await user.click(screen.getByRole('button', { name: /^agregar$/i }));
    expect(onAgregar).toHaveBeenCalledWith(expect.not.objectContaining({ observaciones: expect.anything() }));

    onAgregar.mockReset();
    await user.type(obs, '  Fila que el PDF no dejó leer  ');
    await user.click(screen.getByRole('button', { name: /^agregar$/i }));
    expect(onAgregar).toHaveBeenCalledWith(
      expect.objectContaining({ observaciones: 'Fila que el PDF no dejó leer' }),
    );
  });

  it('Cancelar avisa al caller sin agregar nada', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancelar).toHaveBeenCalled();
    expect(onAgregar).not.toHaveBeenCalled();
  });
});
