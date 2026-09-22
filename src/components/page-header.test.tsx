import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './page-header';

/** El eyebrow es el único <p> del encabezado: se lo busca por etiqueta. */
function eyebrow(contenedor: HTMLElement) {
  return contenedor.querySelector('p');
}

describe('PageHeader', () => {
  it('con área y sin eyebrow muestra el rótulo del área arriba del título', () => {
    const { container } = render(<PageHeader area="operacion" title="Control general" />);

    const linea = eyebrow(container);
    expect(linea?.textContent).toBe('Operación');
    // El rótulo va antes del h1 dentro del mismo bloque.
    expect(linea?.nextElementSibling?.tagName).toBe('H1');
  });

  it('con área y eyebrow los concatena con " · "', () => {
    const { container } = render(
      <PageHeader area="operacion" eyebrow="Las que cargaste vos" title="Novedades" />,
    );

    expect(eyebrow(container)?.textContent).toBe('Operación · Las que cargaste vos');
  });

  it('sin área muestra solo el eyebrow, como hasta ahora', () => {
    const { container } = render(<PageHeader eyebrow="Admin" title="Usuarios" />);

    expect(eyebrow(container)?.textContent).toBe('Admin');
  });

  it('sin área ni eyebrow no renderiza la línea de eyebrow', () => {
    const { container } = render(<PageHeader title="Usuarios" />);

    expect(eyebrow(container)).toBeNull();
  });

  it('siempre renderiza el título en el h1', () => {
    render(<PageHeader area="resultados" eyebrow="Quincena" title="Liquidación" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Liquidación');
  });
});
