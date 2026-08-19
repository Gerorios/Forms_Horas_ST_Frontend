import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdjuntoInput } from './adjunto-input';

/** Validación previa a la subida (revisión 2026-08-19): rechazar acá evita
 * subir un archivo grande por datos móviles para recibir el error después, y
 * siempre se le dice al usuario qué pasó. */
describe('AdjuntoInput — validación', () => {
  const archivo = (nombre: string, type: string, bytes: number) =>
    new File([new Uint8Array(bytes)], nombre, { type });

  it('acepta un PDF chico y lo informa al padre', async () => {
    const onArchivo = vi.fn();
    render(<AdjuntoInput onArchivo={onArchivo} />);
    await userEvent.upload(
      screen.getByLabelText(/certificado/i),
      archivo('cert.pdf', 'application/pdf', 1024),
    );
    expect(onArchivo).toHaveBeenCalledTimes(1);
    expect(screen.getByText('cert.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // El atributo `accept` del input es solo un filtro del diálogo del sistema y
  // se puede saltear; por eso se valida el type en código. userEvent.upload
  // respeta `accept`, así que este bypass se simula con fireEvent.
  it('rechaza un tipo no permitido y avisa, sin llamar al padre', () => {
    const onArchivo = vi.fn();
    render(<AdjuntoInput onArchivo={onArchivo} />);
    const input = screen.getByLabelText(/certificado/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [archivo('planilla.xlsx', 'application/vnd.ms-excel', 1024)] } });
    expect(onArchivo).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/JPG o PNG.*PDF/i);
  });

  it('rechaza un archivo de más de 10 MB y dice cuánto pesa', async () => {
    const onArchivo = vi.fn();
    render(<AdjuntoInput onArchivo={onArchivo} />);
    await userEvent.upload(
      screen.getByLabelText(/certificado/i),
      archivo('foto.jpg', 'image/jpeg', 11 * 1024 * 1024),
    );
    expect(onArchivo).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/11\.0 MB.*máximo es 10 MB/i);
  });
});
