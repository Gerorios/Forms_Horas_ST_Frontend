import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatTile } from './stat-tile';

/** La raíz del tile es el único hijo del contenedor que monta RTL. */
function raiz(container: HTMLElement) {
  return container.firstElementChild as HTMLElement;
}

describe('StatTile — tamaño del valor por longitud', () => {
  it('un valor de más de 12 caracteres se achica y corta por palabra', () => {
    const { container } = render(
      <StatTile label="Total certificado" value="$ 12.345.678,90" testId="tile-total" />,
    );

    const valor = screen.getByTestId('tile-total');
    expect(valor.className).toContain('text-lg');
    expect(valor.className).toContain('break-words');
    // Sin `min-w-0` el tile empuja la grilla en vez de cortar el número.
    expect(raiz(container).className).toContain('min-w-0');
  });

  it('un valor corto usa el tamaño normal', () => {
    render(<StatTile label="Operarios con carga" value={12} testId="tile-corto" />);

    const valor = screen.getByTestId('tile-corto');
    expect(valor.className).not.toContain('text-lg');
    expect(valor.className).toContain('text-2xl');
  });

  it('sin testId no pone data-testid en el valor', () => {
    render(<StatTile label="Horas" value={153} />);

    expect(screen.getByText('153')).not.toHaveAttribute('data-testid');
  });
});

describe('StatTile — color del valor', () => {
  it('con colorearSoloSiPositivo un 0 queda en tinta, aunque el tono sea warn', () => {
    render(<StatTile label="Pendientes" value={0} tone="warn" colorearSoloSiPositivo testId="t" />);

    const valor = screen.getByTestId('t');
    expect(valor.className).toContain('text-ink');
    expect(valor.className).not.toContain('text-warn');
  });

  it('con colorearSoloSiPositivo un valor > 0 sí toma el tono', () => {
    render(<StatTile label="Pendientes" value={3} tone="warn" colorearSoloSiPositivo testId="t" />);

    expect(screen.getByTestId('t').className).toContain('text-warn');
  });

  it('sin colorearSoloSiPositivo el tono manda siempre', () => {
    render(<StatTile label="Manual" value="—" tone="manual" testId="t" />);

    expect(screen.getByTestId('t').className).toContain('text-[#3b6fc4]');
  });

  it('el tono ok pinta de aprobado y danger de peligro', () => {
    const { unmount } = render(<StatTile label="Ok" value="8" tone="ok" testId="t" />);
    expect(screen.getByTestId('t').className).toContain('text-approved');
    unmount();

    render(<StatTile label="Sin carga" value={2} tone="danger" colorearSoloSiPositivo testId="t2" />);
    expect(screen.getByTestId('t2').className).toContain('text-danger');
  });
});

describe('StatTile — envoltorio según interacción', () => {
  it('con href es un link a esa ruta', () => {
    render(<StatTile label="Sin carga" value={2} href="/control-general" />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/control-general');
  });

  it('con onClick es un botón y el clic llama al handler', async () => {
    const onClick = vi.fn();
    render(<StatTile label="Sin carga" value={2} onClick={onClick} />);

    const boton = screen.getByRole('button');
    expect(boton).toHaveAttribute('type', 'button');
    await userEvent.click(boton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('sin href ni onClick no es clickeable', () => {
    render(<StatTile label="Horas" value={153} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('StatTile — partes opcionales', () => {
  it('renderiza el sub debajo del valor', () => {
    render(<StatTile label="Horas" value={153} sub="incluye 35 hs en otros contratos" />);

    expect(screen.getByText('incluye 35 hs en otros contratos')).toBeInTheDocument();
  });

  it('renderiza el icono junto al label', () => {
    render(<StatTile label="Horas" value={153} icon={<svg data-testid="icono" />} />);

    expect(screen.getByTestId('icono')).toBeInTheDocument();
  });

  it('con animar agrega la animación de entrada y sin animar no', () => {
    const { container, unmount } = render(<StatTile label="Horas" value={1} animar />);
    expect(raiz(container).className).toContain('animate-in');
    unmount();

    const { container: c2 } = render(<StatTile label="Horas" value={1} />);
    expect(raiz(c2).className).not.toContain('animate-in');
  });
});
