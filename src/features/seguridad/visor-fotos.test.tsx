import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(async () => ({ data: new Blob(['jpg'], { type: 'image/jpeg' }) })) },
}));

import { DetalleReporte } from './detalle-reporte';
import type { ReporteSeguridad } from '@/lib/api/seguridad';

beforeAll(() => {
  // jsdom no implementa object URLs.
  URL.createObjectURL = vi.fn(() => 'blob:foto');
  URL.revokeObjectURL = vi.fn();
});

const foto = (id: number, grupo: 'riesgo' | 'control') => ({ id, grupo, origen: 'camara' as const, subidoEn: '2026-10-08T10:00:00Z', conUbicacion: true });

const reporte = {
  id: 7,
  tipo: 'aviso_riesgo',
  estado: 'pendiente',
  fechaReporte: '2026-10-06',
  enviadoEn: '2026-10-07T11:42:00Z',
  autor: { cuil: '20111', nombre: 'PEREZ' },
  provincia: { id: 1, nombre: 'Salta' },
  contrato: { id: 2, codigo: 'K2', nombre: 'K2' },
  tarea: { id: 3, nombre: 'Conexión' },
  ubicacion: null,
  descripcion: 'Zanja sin vallar',
  naturaleza: { id: 4, nombre: 'Condición peligrosa' },
  motivoParalizacion: null,
  controlRiesgo: 'Vallé',
  involucrados: [],
  fotos: [foto(1, 'riesgo'), foto(2, 'riesgo'), foto(3, 'control')],
  punto: null,
  puntaje: null,
  comentarioHys: null,
  calificadoPor: null,
  calificadoEn: null,
  motivoAnulacion: null,
  alarma: false,
} as ReporteSeguridad;

describe('ver una foto en grande', () => {
  it('tocar la miniatura abre el visor a pantalla completa y recorre todas las fotos', async () => {
    render(<DetalleReporte reporte={reporte} />);
    await userEvent.click(screen.getAllByRole('button', { name: /Ampliar: foto de lo que se vio/ })[1]);

    const visor = screen.getByRole('dialog', { name: 'Foto ampliada' });
    expect(visor).toHaveTextContent('Foto de lo que se vio · 2 de 3');

    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }));
    expect(visor).toHaveTextContent('Foto de lo que se hizo · 3 de 3');
    expect(screen.getByRole('button', { name: 'Foto siguiente' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Foto ampliada' })).not.toBeInTheDocument();
  });
});
