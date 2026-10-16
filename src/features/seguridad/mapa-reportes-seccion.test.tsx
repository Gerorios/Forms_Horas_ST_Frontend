import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const PUNTO = {
  id: 1,
  tipo: 'paralizacion',
  estado: 'aprobado',
  fechaReporte: '2026-10-05',
  puntaje: 8,
  provincia: 'Salta',
  contrato: 'K2',
  tarea: 'Conexión',
  naturaleza: null,
  motivoParalizacion: 'Viento / clima',
  punto: { latitud: -24.78, longitud: -65.41, errorMetros: null, origen: 'mapa' },
};

vi.mock('@/lib/api/seguridad', () => ({
  useMapaReportes: (_rango: unknown, habilitado: boolean) => ({
    data: habilitado ? [PUNTO, { ...PUNTO, id: 2, tipo: 'incidente' }] : undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));
// Leaflet no corre en jsdom: el mapa muestra cuántos pines recibe.
vi.mock('./mapa-reportes', () => ({
  default: ({ puntos, vista }: { puntos: unknown[]; vista: string }) => <p>{`mapa: ${puntos.length} ${vista}`}</p>,
}));

import { MapaReportesSeccion } from './mapa-reportes-seccion';

function Abierto() {
  return <MapaReportesSeccion rango={{}} abierto onAbrir={vi.fn()} />;
}

describe('MapaReportesSeccion', () => {
  it('cerrado no pide datos; "Ver el mapa" avisa que se abre', async () => {
    const onAbrir = vi.fn();
    render(<MapaReportesSeccion rango={{}} abierto={false} onAbrir={onAbrir} />);
    expect(screen.queryByRole('group', { name: 'Tipos de reporte en el mapa' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver el mapa' }));
    expect(onAbrir).toHaveBeenCalledWith(true);
  });

  it('los chips de tipo filtran los pines y el calor avisa que hay pocos datos', async () => {
    render(<Abierto />);
    expect(await screen.findByText('mapa: 2 pines')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Incidente/ }));
    expect(await screen.findByText('mapa: 1 pines')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Mapa de calor' }));
    expect(screen.getByRole('status')).toHaveTextContent(/todavía no dice mucho/);
  });

  it('pantalla completa: ocupa la ventana con los filtros, y se sale con el botón o con Esc', async () => {
    render(<Abierto />);
    await userEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    const dialogo = screen.getByRole('dialog', { name: 'Mapa de reportes en pantalla completa' });
    expect(dialogo).toHaveClass('fixed');
    expect(screen.getByRole('group', { name: 'Tipos de reporte en el mapa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salir de pantalla completa' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pantalla completa' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('');

    await userEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salir de pantalla completa' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
