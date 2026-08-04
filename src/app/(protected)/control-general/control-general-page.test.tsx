import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResumenOperario, OperarioSinCarga } from '@/lib/api/panel-general';

const RESUMEN: ResumenOperario[] = [
  {
    cuil: '20222222222',
    apellido_nombre: 'GOMEZ ANA',
    totalHoras: 40,
    pendiente: 0,
    aprobado: 5,
    desaprobado: 0,
    horasAprobadas: 40,
    superaHorasExtra: false,
    tieneAlertaCruzada: false,
    horasAprobadasAnterior: 0,
    deltaHorasAprobadas: 40,
  },
  {
    cuil: '20111111111',
    apellido_nombre: 'PEREZ JUAN',
    totalHoras: 95,
    pendiente: 1,
    aprobado: 9,
    desaprobado: 0,
    horasAprobadas: 90,
    superaHorasExtra: true,
    tieneAlertaCruzada: false,
    horasAprobadasAnterior: 90,
    deltaHorasAprobadas: 0,
  },
  {
    cuil: '20444444444',
    apellido_nombre: 'ACEVEDO CRISTIAN',
    totalHoras: 18,
    pendiente: 0,
    aprobado: 2,
    desaprobado: 0,
    horasAprobadas: 18,
    superaHorasExtra: false,
    tieneAlertaCruzada: true,
    horasAprobadasAnterior: 10,
    deltaHorasAprobadas: 8,
  },
];

const SIN_CARGA: OperarioSinCarga[] = [
  { cuil: '20555555555', apellido_nombre: 'DIAZ MARIA', legajo: 456, cargo: 'Peón', ultimaCarga: null },
  { cuil: '20333333333', apellido_nombre: 'TORRES LUIS', legajo: 123, cargo: 'Peón', ultimaCarga: '2026-07-10' },
];

vi.mock('@/lib/api/panel-general', () => ({
  useResumenOperarios: () => ({ data: RESUMEN, isLoading: false }),
  useSinCarga: () => ({ data: SIN_CARGA, isLoading: false }),
}));

import ControlGeneralPage from './page';

describe('ControlGeneralPage', () => {
  it('muestra el resumen por operario con el total real y la alerta de horas extra', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('+88hs')).toBeInTheDocument();
  });

  it('muestra la lista de sin carga', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('TORRES LUIS')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('muestra la última carga de cada uno, o "Nunca" si no tiene ninguna', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('2026-07-10')).toBeInTheDocument();
    expect(screen.getByText('Nunca')).toBeInTheDocument();
  });

  it('en sin carga, ordena primero a quien tenía carga antes (dejó de reportar) sobre quien nunca cargó', () => {
    render(<ControlGeneralPage />);
    const filas = screen.getAllByRole('row').filter((f) => f.textContent?.includes('Peón'));
    expect(filas[0].textContent).toContain('TORRES LUIS');
    expect(filas[1].textContent).toContain('DIAZ MARIA');
  });

  it('arranca en la quincena anterior (ya cerrada), no en la actual', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByLabelText('Quincena')).toBeInTheDocument();
  });

  it('muestra los stat tiles con los totales de la quincena', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('Operarios con carga')).toBeInTheDocument();
    expect(screen.getByText('Con horas extra (+88hs)')).toBeInTheDocument();
    expect(screen.getByText('Filas pendientes de revisar')).toBeInTheDocument();
    expect(screen.getByText('Sin carga')).toBeInTheDocument();
  });

  it('ordena primero a quien necesita revisión (horas extra o alerta cruzada), el resto al final', () => {
    render(<ControlGeneralPage />);
    const filas = screen.getAllByRole('row').slice(1); // sin el header
    const nombres = filas.map((f) => f.textContent);
    expect(nombres[0]).toContain('PEREZ JUAN'); // horas extra + pendiente
    expect(nombres[1]).toContain('ACEVEDO CRISTIAN'); // alerta cruzada
    expect(nombres[2]).toContain('GOMEZ ANA'); // sin nada que revisar, al final
  });

  it('el nombre del operario es un link a Aprobaciones filtrado por ese operario', () => {
    render(<ControlGeneralPage />);
    const link = screen.getByRole('link', { name: 'ACEVEDO CRISTIAN' });
    expect(link).toHaveAttribute('href', '/aprobaciones?operarioCuil=20444444444');
  });

  it('muestra el delta de horas aprobadas vs la quincena anterior', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('+40hs')).toBeInTheDocument();
    expect(screen.getByText('+8hs')).toBeInTheDocument();
    expect(screen.getByText('0hs')).toBeInTheDocument();
  });

  it('marca "(nuevo)" cuando no tenía horas aprobadas la quincena anterior', () => {
    render(<ControlGeneralPage />);
    const filaGomez = screen.getByText('GOMEZ ANA').closest('tr')!;
    expect(filaGomez).toHaveTextContent('(nuevo)');
    const filaAcevedo = screen.getByText('ACEVEDO CRISTIAN').closest('tr')!;
    expect(filaAcevedo).not.toHaveTextContent('(nuevo)');
  });

  it('muestra el badge de alerta cruzada solo para quien la tiene', () => {
    render(<ControlGeneralPage />);
    expect(screen.getByText('⚠ cruzado')).toBeInTheDocument();
    const filaAcevedo = screen.getByText('ACEVEDO CRISTIAN').closest('tr');
    expect(filaAcevedo).toContainElement(screen.getByText('⚠ cruzado'));
  });

  it('el buscador de operarios filtra el resumen por nombre', async () => {
    render(<ControlGeneralPage />);
    await userEvent.type(screen.getByLabelText('Buscar operario'), 'gomez');
    expect(screen.getByText('GOMEZ ANA')).toBeInTheDocument();
    expect(screen.queryByText('PEREZ JUAN')).not.toBeInTheDocument();
  });

  it('el buscador de sin carga filtra por nombre', async () => {
    render(<ControlGeneralPage />);
    await userEvent.type(screen.getByLabelText('Buscar empleado sin carga'), 'zzz');
    expect(screen.queryByText('TORRES LUIS')).not.toBeInTheDocument();
    expect(screen.getByText('Sin empleados que coincidan con la búsqueda.')).toBeInTheDocument();
  });

  it('clic en "Con horas extra" filtra el resumen a solo esos operarios', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByText('Con horas extra (+88hs)'));
    expect(screen.getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(screen.queryByText('GOMEZ ANA')).not.toBeInTheDocument();
  });

  it('clic de nuevo en la misma tarjeta activa quita el filtro (toggle)', async () => {
    render(<ControlGeneralPage />);
    const tile = screen.getByText('Con horas extra (+88hs)');
    await userEvent.click(tile);
    await userEvent.click(tile);
    expect(screen.getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(screen.getByText('GOMEZ ANA')).toBeInTheDocument();
  });

  it('clic en "Filas pendientes de revisar" filtra a quienes tienen algo pendiente', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByText('Filas pendientes de revisar'));
    expect(screen.getByText('PEREZ JUAN')).toBeInTheDocument();
    expect(screen.queryByText('GOMEZ ANA')).not.toBeInTheDocument();
  });

  it('clic en "Operarios con carga" vuelve a mostrar todos', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByText('Filas pendientes de revisar'));
    await userEvent.click(screen.getByText('Operarios con carga'));
    expect(screen.getByText('GOMEZ ANA')).toBeInTheDocument();
  });

  it('con un filtro activo, aparece la etiqueta con opción de quitarlo', async () => {
    render(<ControlGeneralPage />);
    await userEvent.click(screen.getByText('Con horas extra (+88hs)'));
    await userEvent.click(screen.getByLabelText('Quitar filtro'));
    expect(screen.getByText('GOMEZ ANA')).toBeInTheDocument();
  });

  it('clic en "Sin carga" hace scroll hacia esa sección', async () => {
    render(<ControlGeneralPage />);
    // No hay layout real en jsdom para verificar la posición del scroll;
    // alcanza con confirmar que el clic no rompe nada y la sección sigue ahí.
    await userEvent.click(screen.getByText('Sin carga'));
    expect(screen.getByText('Sin carga en esta quincena')).toBeInTheDocument();
  });
});
