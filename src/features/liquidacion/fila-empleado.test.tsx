import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { FilaDetalleEmpleado } from '@/lib/api/liquidacion';
import { FilaEmpleado } from './fila-empleado';
import { formatMoney } from './formato';

function fila(overrides: Partial<FilaDetalleEmpleado> = {}): FilaDetalleEmpleado {
  return {
    cuil: '20-1-1',
    nombre: 'PEREZ JUAN',
    regimen: 'jornalizado',
    categoria: 'Oficial',
    montoKmBruto: null,
    horasTotal: '80.00',
    horasCct: '80.00',
    horasExtra: '0.00',
    basico: '80000.00',
    montoExtra: '0.00',
    presentismo: '16000.00',
    totalPlus: '3000.00',
    noRemunerativo: '0.00',
    plusIndividual: null,
    plusIndividualMotivo: null,
    total: '99000.00',
    etiquetaNovedades: '',
    datoFaltante: null,
    zona: 'norte',
    fechaBaja: null,
    estadoBaja: null,
    activo: true,
    diasAusenciaInjustificada: 0,
    diasAusenciaJustificada: 0,
    diasAusenciaSinResolver: 0,
    pendientesAprobacion: 0,
    duplicadoCruzado: false,
    dias: [],
    novedades: [],
    ...overrides,
  };
}

/** Celda de la columna Plus (10ª): se compara el texto de la celda y no con
 * getByText, que no matchea el espacio duro del formato de moneda. */
const celdaPlus = () => document.querySelectorAll('td')[9] as HTMLTableCellElement;

const renderFila = (f: FilaDetalleEmpleado) =>
  render(
    <table>
      <tbody>
        <FilaEmpleado fila={f} />
      </tbody>
    </table>,
  );

describe('FilaEmpleado — columna Plus', () => {
  it('sin plus individual muestra solo el plus de novedades', () => {
    renderFila(fila());
    expect(celdaPlus().textContent).toBe(formatMoney('3000'));
    expect(celdaPlus()).not.toHaveAttribute('title');
  });

  it('suma el plus individual (el TOTAL ya lo incluía) y explica el desglose', () => {
    renderFila(fila({ plusIndividual: '5000.00', plusIndividualMotivo: 'Manejo de máquina', total: '104000.00' }));
    const celda = celdaPlus();
    expect(celda.textContent).toBe(`${formatMoney('8000')}*`);
    expect(celda.title).toContain('individual');
    expect(celda.title).toContain('Manejo de máquina');
  });
});
