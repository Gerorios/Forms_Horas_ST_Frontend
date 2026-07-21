import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CargandoModal } from './cargando-modal';

describe('CargandoModal', () => {
  it('muestra el texto de carga por default', () => {
    render(<CargandoModal />);
    expect(screen.getByText('Cargando reporte…')).toBeInTheDocument();
  });

  it('acepta un texto custom', () => {
    render(<CargandoModal texto="Enviando…" />);
    expect(screen.getByText('Enviando…')).toBeInTheDocument();
  });
});
