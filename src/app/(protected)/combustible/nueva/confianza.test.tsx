import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExtraccionTicket } from '@/types/domain';

const extraerTicket = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/auth/session', () => ({
  useSession: () => ({ perfil: { cuil: '20-1-1', contratosHabilitados: [{ contrato: { id: 1, codigo: 'K5', nombre: 'K5' } }] } }),
}));
vi.mock('@/lib/api/catalogos', () => ({
  useMoviles: () => ({ data: [{ id: 7, identificador: 'AB123CD' }] }),
  useProvincias: () => ({ data: [{ id: 1, nombre: 'Salta' }] }),
  useTareas: () => ({ data: [{ id: 1, nombre: 'Traslado' }] }),
}));
vi.mock('@/lib/api/combustible', () => ({
  useEstacionesServicio: () => ({ data: [{ id: 5, nombre: 'Estación Sur' }] }),
  useTiposCombustible: () => ({ data: [{ id: 1, nombre: 'Gasoil' }] }),
  useUltimoKm: () => ({ data: null }),
  useCrearCargaCombustible: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExtraerTicket: () => ({ mutateAsync: extraerTicket, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/combustible/foto-ticket', () => ({
  FotoTicket: ({ onFoto }: { onFoto: (blob: Blob) => void }) => (
    <button type="button" onClick={() => onFoto(new Blob(['x'], { type: 'image/jpeg' }))}>
      Sacar foto del ticket
    </button>
  ),
}));

import NuevaCargaCombustiblePage from './page';

const extraccion = (over: Partial<NonNullable<ExtraccionTicket['sugerencias']>>): ExtraccionTicket => ({
  legible: true,
  sugerencias: {
    litros: null, monto: null, fechaCarga: null, nroComprobante: null,
    tipoCombustibleId: null, estacionId: null, tipoComprobante: null,
    medioPagoSugerido: null, confianzaNumero: null, lineaOrigenNumero: null,
    precioLitro: null, advertenciaCoherencia: null, patente: null, km: null,
    movilId: null, tipoCombustibleLeido: null, cuitEstacionLeido: null,
    camposInseguros: [], alertaDuplicado: null,
    ...over,
  },
});

/** Señales de confianza del plan 2026-08-18 ("mejor vacío que equivocado"). */
describe('NuevaCargaCombustiblePage — señales de confianza', () => {
  beforeEach(() => extraerTicket.mockReset());

  it('avisa cuántos datos no coincidieron entre las dos lecturas y marca los campos', async () => {
    extraerTicket.mockResolvedValue(extraccion({ camposInseguros: ['nroComprobante', 'monto'] }));
    render(<NuevaCargaCombustiblePage />);
    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => expect(screen.getByText(/2 datos no coincidieron/)).toBeInTheDocument());
    expect(screen.getAllByText(/revisá con la foto/i).length).toBeGreaterThanOrEqual(2);
  });

  it('sin discrepancias no muestra ninguna marca de revisión', async () => {
    extraerTicket.mockResolvedValue(extraccion({ litros: 40, monto: 40000 }));
    render(<NuevaCargaCombustiblePage />);
    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => expect(screen.getAllByText(/sugerido por IA/i).length).toBeGreaterThan(0));
    expect(screen.queryByText(/revisá con la foto/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no coincidi/i)).not.toBeInTheDocument();
  });

  it('avisa si el comprobante ya fue cargado en esa estación', async () => {
    extraerTicket.mockResolvedValue(extraccion({ alertaDuplicado: { cargaId: 42 } }));
    render(<NuevaCargaCombustiblePage />);
    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => expect(screen.getByText(/Ya existe una carga/)).toBeInTheDocument());
    expect(screen.getByText(/carga #42/)).toBeInTheDocument();
  });
});
