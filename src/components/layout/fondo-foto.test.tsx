import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FondoFoto } from './fondo-foto';

describe('FondoFoto', () => {
  it('sin src no renderiza imagen (marcador) y muestra los children', () => {
    const { container } = render(
      <FondoFoto>
        <p>contenido</p>
      </FondoFoto>,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  it('con src renderiza la foto como decorativa (alt vacío)', () => {
    const { container } = render(
      <FondoFoto src="/fotos/x.jpg">
        <p>contenido</p>
      </FondoFoto>,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  // En Next 16 + jsdom `priority` no emite `fetchpriority`: lo observable es
  // `loading` (prioritaria = sin `loading`; no prioritaria = `loading="lazy"`).
  it('por defecto la foto es prioritaria (sin carga diferida)', () => {
    const { container } = render(<FondoFoto src="/fotos/x.jpg" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).not.toHaveAttribute('loading', 'lazy');
  });

  it('con prioridad={false} la foto se carga diferida (login)', () => {
    const { container } = render(<FondoFoto src="/fotos/x.jpg" prioridad={false} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});
