import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RegistrosCards } from './registros-cards';
import type { RegistroHoras } from '@/types/domain';
import type { Quincena } from '@/lib/quincena';

function reg(
  id: number,
  fecha: string,
  horas: string,
  estado: RegistroHoras['estado'] = 'aprobado',
  codigo = 'K5',
): RegistroHoras {
  return {
    id, loteId: `lote-${id}`, fecha, horas, estado, alertaHoras: false, motivoDesaprobacion: null, observacion: null,
    operario: { cuil: '20111', apellido_nombre: 'PEREZ JUAN' },
    contrato: { id: 1, codigo, nombre: codigo },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [],
  };
}

const QUINCENA_1: Quincena = { anio: 2026, mes: 7, parte: 1 };

describe('RegistrosCards', () => {
  it('muestra el total grande de la quincena', () => {
    render(<RegistrosCards registros={[reg(1, '2026-07-05', '8'), reg(2, '2026-07-10', '6')]} quincena={QUINCENA_1} isLoading={false} />);
    expect(screen.getByText('14 hs')).toBeInTheDocument();
  });

  it('una tarjeta por registro, no por día — 2 líneas el mismo día son 2 tarjetas', () => {
    render(
      <RegistrosCards
        registros={[reg(1, '2026-07-05', '8', 'aprobado', 'K5'), reg(2, '2026-07-05', '5', 'pendiente', 'K8')]}
        quincena={QUINCENA_1}
        isLoading={false}
      />,
    );
    expect(screen.getByText('K5')).toBeInTheDocument();
    expect(screen.getByText('K8')).toBeInTheDocument();
    expect(screen.getAllByText('2026-07-05')).toHaveLength(2);
  });

  it('filtra fuera de la quincena seleccionada', () => {
    render(<RegistrosCards registros={[reg(1, '2026-07-20', '8')]} quincena={QUINCENA_1} isLoading={false} />);
    expect(screen.getByText('Sin registros en esta quincena.')).toBeInTheDocument();
  });

  it('muestra el motivo de desaprobación visible (no oculto en tooltip)', () => {
    const r = { ...reg(1, '2026-07-05', '8', 'desaprobado'), motivoDesaprobacion: 'faltan datos' };
    render(<RegistrosCards registros={[r]} quincena={QUINCENA_1} isLoading={false} />);
    expect(screen.getByText(/faltan datos/)).toBeInTheDocument();
  });

  it('no suma lo desaprobado en el total a cobrar, aunque la tarjeta siga visible', () => {
    render(
      <RegistrosCards
        registros={[reg(1, '2026-07-05', '8', 'aprobado'), reg(2, '2026-07-06', '5', 'desaprobado')]}
        quincena={QUINCENA_1}
        isLoading={false}
      />,
    );
    const total = screen.getAllByText('8 hs').find((el) => el.className.includes('text-4xl'));
    expect(total).toBeTruthy();
    expect(screen.getAllByText('2026-07-06')).toHaveLength(1);
  });

  it('isLoading muestra el estado de carga', () => {
    render(<RegistrosCards registros={undefined} quincena={QUINCENA_1} isLoading />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });
});
