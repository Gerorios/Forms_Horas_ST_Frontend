import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CargasAgrupadas } from './cargas-agrupadas';
import type { RegistroHoras } from '@/types/domain';
import type { Quincena } from '@/lib/quincena';

function reg(
  id: number,
  loteId: string,
  fecha: string,
  horas: string,
  apellido = 'PEREZ',
  estado: RegistroHoras['estado'] = 'aprobado',
): RegistroHoras {
  return {
    id, loteId, fecha, horas, estado, alertaHoras: false, motivoDesaprobacion: null, observacion: null, loteIdOrigen: null,
    operario: { cuil: '20111', apellido_nombre: apellido },
    contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [{ movil: { id: 1, identificador: 'M-01' } }],
  };
}

const QUINCENA_1: Quincena = { anio: 2026, mes: 7, parte: 1 };

/** El texto queda partido entre <span> anidados; getByText con string/regex
 * no cruza elementos, así que se busca por el textContent normalizado. */
function porTexto(regex: RegExp) {
  return (_: string, el: Element | null) => !!el && el.tagName === 'P' && regex.test(el.textContent ?? '');
}

describe('CargasAgrupadas', () => {
  it('agrupa por lote (no una tarjeta por operario/fila) y suma el total real de la cuadrilla', () => {
    render(
      <CargasAgrupadas
        registros={[
          reg(1, 'lote-a', '2026-07-05', '8', 'PEREZ'),
          reg(2, 'lote-a', '2026-07-05', '8', 'GOMEZ'),
        ]}
        quincena={QUINCENA_1}
        isLoading={false}
      />,
    );
    // 1 sola tarjeta para el lote, con el total de la cuadrilla (8, no 16).
    expect(screen.getAllByRole('button', { name: /ver detalle/i })).toHaveLength(1);
    expect(screen.getByText('8 hs')).toBeInTheDocument();
  });

  it('filtra por quincena', () => {
    render(
      <CargasAgrupadas
        registros={[reg(1, 'lote-a', '2026-07-20', '8')]}
        quincena={QUINCENA_1}
        isLoading={false}
      />,
    );
    expect(screen.getByText('Sin cargas en esta quincena.')).toBeInTheDocument();
  });

  it('al expandir, muestra el estado de cada fila (pueden mezclarse dentro de un mismo lote)', async () => {
    render(
      <CargasAgrupadas
        registros={[
          reg(1, 'lote-a', '2026-07-05', '8', 'PEREZ', 'aprobado'),
          reg(2, 'lote-a', '2026-07-05', '8', 'GOMEZ', 'pendiente'),
        ]}
        quincena={QUINCENA_1}
        isLoading={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('oculta la carga rechazada que fue totalmente reemplazada; la corrección la muestra fusionada', async () => {
    const rechazada = {
      ...reg(1, 'lote-viejo', '2026-07-05', '12', 'PEREZ', 'desaprobado'),
      motivoDesaprobacion: 'según recorrido son 8hs',
    };
    const corregida = { ...reg(2, 'lote-nuevo', '2026-07-05', '8', 'PEREZ', 'aprobado'), loteIdOrigen: 'lote-viejo' };
    render(
      <CargasAgrupadas registros={[rechazada, corregida]} quincena={QUINCENA_1} isLoading={false} />,
    );
    // Solo 1 tarjeta (la corregida) — la rechazada no aparece por separado.
    const detalles = screen.getAllByRole('button', { name: /ver detalle/i });
    expect(detalles).toHaveLength(1);
    await userEvent.click(detalles[0]);
    expect(screen.getByText(porTexto(/corregido de 12 a 8 hs/i))).toBeInTheDocument();
    expect(screen.getByText(/según recorrido son 8hs/)).toBeInTheDocument();
  });

  it('si un lote tiene un contrato corregido y otro sin corregir, no se oculta', async () => {
    const rechazada = reg(1, 'lote-viejo', '2026-07-05', '12', 'PEREZ', 'desaprobado');
    const corregida = { ...reg(2, 'lote-nuevo', '2026-07-05', '8', 'PEREZ', 'aprobado'), loteIdOrigen: 'lote-viejo' };
    const otroContrato = {
      ...reg(3, 'lote-viejo', '2026-07-05', '4', 'PEREZ', 'pendiente'),
      contrato: { id: 2, codigo: 'K8', nombre: 'K8' },
    };
    render(
      <CargasAgrupadas
        registros={[rechazada, corregida, otroContrato]}
        quincena={QUINCENA_1}
        isLoading={false}
      />,
    );
    // El lote viejo sigue visible porque K8 (pendiente) no fue reemplazado.
    expect(screen.getAllByRole('button', { name: /ver detalle/i })).toHaveLength(2);
  });

  it('no muestra "⚠ Revisar" aunque la línea tenga ≥16hs — acá no se computa el cruce entre contratos', () => {
    render(
      <CargasAgrupadas
        registros={[reg(1, 'lote-a', '2026-07-05', '18', 'PEREZ')]}
        quincena={QUINCENA_1}
        isLoading={false}
      />,
    );
    expect(screen.queryByText('⚠ Revisar')).not.toBeInTheDocument();
  });

  it('isLoading muestra el estado de carga', () => {
    render(<CargasAgrupadas registros={undefined} quincena={QUINCENA_1} isLoading />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });
});
