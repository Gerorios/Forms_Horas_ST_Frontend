import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { agruparPorLote } from '@/lib/agrupar';
import type { RegistroPorAprobar } from '@/types/domain';
import { LoteResumenCard } from './lote-resumen-card';

function fila(
  id: number,
  apellido: string,
  overrides: Partial<RegistroPorAprobar> = {},
): RegistroPorAprobar {
  return {
    id, loteId: 'lote-1', fecha: '2026-07-10', horas: '8', estado: 'aprobado',
    alertaHoras: false, motivoDesaprobacion: null, observacion: null, loteIdOrigen: null,
    operario: { cuil: `2011${id}`, apellido_nombre: apellido },
    contrato: { id: 1, codigo: 'K5', nombre: 'K5' },
    tareas: [{ tarea: { id: 1, nombre: 'Excavación' } }],
    provincia: { id: 1, nombre: 'Córdoba' },
    moviles: [{ movil: { id: 1, identificador: 'M-01' } }],
    accionable: true,
    ...overrides,
  };
}

function grupo(filas: RegistroPorAprobar[]) {
  return agruparPorLote(filas)[0];
}

/** El texto queda partido entre <span> anidados; getByText con string/regex
 * no cruza elementos, así que se busca por el textContent normalizado. */
function porTexto(regex: RegExp) {
  return (_: string, el: Element | null) => !!el && el.tagName === 'P' && regex.test(el.textContent ?? '');
}

describe('LoteResumenCard', () => {
  it('muestra el resumen de la carga; el detalle por contrato está colapsado por default', () => {
    render(<LoteResumenCard grupo={grupo([fila(1, 'PEREZ')])} />);
    expect(screen.getByText(/2026-07-10/)).toBeInTheDocument();
    expect(screen.queryByText('K5')).not.toBeInTheDocument();
  });

  it('al expandir, agrupa por contrato con subtotal y tareas', async () => {
    render(<LoteResumenCard grupo={grupo([fila(1, 'PEREZ'), fila(2, 'GOMEZ', { accionable: false })])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByText('K5')).toBeInTheDocument();
    expect(screen.getAllByText('PEREZ').length).toBeGreaterThan(0);
    expect(screen.getByText('GOMEZ')).toBeInTheDocument();
  });

  it('sin mostrarEstado, no muestra el badge de estado por fila', async () => {
    render(<LoteResumenCard grupo={grupo([fila(1, 'PEREZ')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.queryByText('Aprobado')).not.toBeInTheDocument();
  });

  it('con mostrarEstado, muestra el badge de estado de cada fila', async () => {
    render(
      <LoteResumenCard
        grupo={grupo([fila(1, 'PEREZ', { estado: 'aprobado' }), fila(2, 'GOMEZ', { estado: 'pendiente' })])}
        mostrarEstado
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('muestra el motivo cuando la fila lo tiene, sin importar mostrarEstado', async () => {
    render(
      <LoteResumenCard
        grupo={grupo([fila(1, 'PEREZ', { estado: 'desaprobado', motivoDesaprobacion: 'no corresponde' })])}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByText(/no corresponde/i)).toBeInTheDocument();
  });

  it('muestra la observación de la línea cuando existe', async () => {
    render(
      <LoteResumenCard
        grupo={grupo([fila(1, 'PEREZ', { observacion: 'Viajó a otra localidad' })])}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByText(/viajó a otra localidad/i)).toBeInTheDocument();
  });

  it('sin observación, no muestra la etiqueta', async () => {
    render(<LoteResumenCard grupo={grupo([fila(1, 'PEREZ')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.queryByText(/observación/i)).not.toBeInTheDocument();
  });

  it('con infoCorreccionPorContrato tipo "reemplazada", muestra las horas nuevas', async () => {
    const nueva = {
      id: 2, loteId: 'lote-2', loteIdOrigen: 'lote-1', contrato: { id: 1 }, horas: 6, motivoDesaprobacion: null,
    };
    render(
      <LoteResumenCard
        grupo={grupo([fila(1, 'PEREZ')])}
        infoCorreccionPorContrato={{ 1: { tipo: 'reemplazada', nueva } }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByText(/reemplazada por una corrección/i)).toBeInTheDocument();
  });

  it('con infoCorreccionPorContrato tipo "corrige", muestra antes/después y el motivo', async () => {
    const original = {
      id: 1, loteId: 'lote-1', loteIdOrigen: null, contrato: { id: 1 }, horas: 12,
      motivoDesaprobacion: 'según recorrido son 8hs',
    };
    render(
      <LoteResumenCard
        grupo={grupo([fila(1, 'PEREZ')])}
        infoCorreccionPorContrato={{ 1: { tipo: 'corrige', original } }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.getByText(porTexto(/corregido de 12 a 8 hs/i))).toBeInTheDocument();
    expect(screen.getByText(/según recorrido son 8hs/)).toBeInTheDocument();
  });

  it('sin infoCorreccionPorContrato para ese contrato, no muestra nada', async () => {
    render(<LoteResumenCard grupo={grupo([fila(1, 'PEREZ')])} infoCorreccionPorContrato={{}} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.queryByText(/corrección/i)).not.toBeInTheDocument();
  });

  it('sin onReabrir, no muestra ningún botón de reabrir', async () => {
    render(<LoteResumenCard grupo={grupo([fila(1, 'PEREZ')])} />);
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    expect(screen.queryByRole('button', { name: /^reabrir$/i })).not.toBeInTheDocument();
  });

  it('con onReabrir, solo aparece en filas accionables y llama con id y nombre', async () => {
    const onReabrir = vi.fn();
    render(
      <LoteResumenCard
        grupo={grupo([fila(1, 'PEREZ', { accionable: true }), fila(2, 'GOMEZ', { accionable: false })])}
        onReabrir={onReabrir}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /ver detalle/i }));
    const botones = screen.getAllByRole('button', { name: /^reabrir$/i });
    expect(botones).toHaveLength(1);
    await userEvent.click(botones[0]);
    expect(onReabrir).toHaveBeenCalledWith(1, 'PEREZ');
  });
});
