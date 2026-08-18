import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExtraccionTicket } from '@/types/domain';

const extraerTicket = vi.fn();
const crear = vi.fn().mockResolvedValue({});

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/lib/auth/session', () => ({
  useSession: () => ({
    perfil: {
      contratosHabilitados: [{ contrato: { id: 1, codigo: 'C-01' } }],
    },
  }),
}));

vi.mock('@/lib/api/catalogos', () => ({
  useProvincias: () => ({ data: [{ id: 1, nombre: 'Buenos Aires' }] }),
  useMoviles: () => ({ data: [{ id: 1, identificador: 'INT-101' }] }),
  useTareas: () => ({ data: [] }),
}));

vi.mock('@/lib/api/combustible', () => ({
  useEstacionesServicio: () => ({ data: [{ id: 1, nombre: 'YPF Ruta 9' }] }),
  useTiposCombustible: () => ({ data: [{ id: 1, nombre: 'Diesel' }] }),
  useUltimoKm: () => ({ data: { km: null, fechaCarga: null } }),
  useCrearCargaCombustible: () => ({ mutateAsync: crear, isPending: false }),
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

function extraccionBase(sugerencias: Partial<NonNullable<ExtraccionTicket['sugerencias']>>): ExtraccionTicket {
  return {
    legible: true,
    sugerencias: {
      litros: null,
      monto: null,
      fechaCarga: null,
      nroComprobante: null,
      tipoCombustibleId: null,
      estacionId: null,
      tipoComprobante: null,
      medioPagoSugerido: null,
      confianzaNumero: null,
      lineaOrigenNumero: null,
      precioLitro: null,
      advertenciaCoherencia: null,
      patente: null,
      km: null,
      movilId: null,
      tipoCombustibleLeido: null,
      cuitEstacionLeido: null,
      camposInseguros: [],
      alertaDuplicado: null,
      ...sugerencias,
    },
  };
}

describe('NuevaCargaCombustiblePage — sugerencias v2', () => {
  beforeEach(() => {
    extraerTicket.mockReset();
    crear.mockClear();
  });

  it('preselecciona el medio de pago sugerido cuando el usuario no lo tocó', async () => {
    extraerTicket.mockResolvedValue(extraccionBase({ medioPagoSugerido: 'cuenta_corriente' }));
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      const radio = screen.getByRole('radio', { name: 'Cuenta corriente' }) as HTMLInputElement;
      expect(radio.checked).toBe(true);
    });
  });

  it('no pisa el medio de pago si el usuario ya eligió uno, y avisa la contradicción', async () => {
    extraerTicket.mockResolvedValue(extraccionBase({ medioPagoSugerido: 'cuenta_corriente' }));
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('radio', { name: 'Caja' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      expect(screen.getByText(/La foto parece un remito \(cuenta corriente\)/i)).toBeInTheDocument();
    });
    const radioCaja = screen.getByRole('radio', { name: 'Caja' }) as HTMLInputElement;
    expect(radioCaja.checked).toBe(true);
  });

  it('muestra el chip de confianza y la línea de origen leída', async () => {
    extraerTicket.mockResolvedValue(
      extraccionBase({
        nroComprobante: '0001-00012345',
        confianzaNumero: 'baja',
        lineaOrigenNumero: 'NRO COMP 0001-00012345',
      }),
    );
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      expect(screen.getByText('Confianza: baja')).toBeInTheDocument();
    });
    expect(screen.getByText(/Leído de:/)).toBeInTheDocument();
    expect(screen.getByText(/NRO COMP 0001-00012345/)).toBeInTheDocument();
  });

  it('muestra el aviso de coherencia debajo del monto', async () => {
    extraerTicket.mockResolvedValue(
      extraccionBase({ advertenciaCoherencia: 'El litraje no coincide con el monto informado' }),
    );
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      expect(
        screen.getByText('El litraje no coincide con el monto informado'),
      ).toBeInTheDocument();
    });
  });

  it('limpia el aviso de coherencia al editar el monto a mano', async () => {
    extraerTicket.mockResolvedValue(
      extraccionBase({ monto: 168013.88, advertenciaCoherencia: 'El litraje no coincide con el monto informado' }),
    );
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      expect(
        screen.getByText('El litraje no coincide con el monto informado'),
      ).toBeInTheDocument();
    });

    await userEvent.type(screen.getByRole('spinbutton', { name: 'Monto' }), '5');

    await waitFor(() => {
      expect(
        screen.queryByText('El litraje no coincide con el monto informado'),
      ).not.toBeInTheDocument();
    });
  });

  it('pre-selecciona móvil y km sugeridos', async () => {
    extraerTicket.mockResolvedValue(extraccionBase({ movilId: 1, km: 45210 }));
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: 'Móvil' }) as HTMLSelectElement;
      expect(select.value).toBe('1');
    });
    const select = screen.getByRole('combobox', { name: 'Móvil' });
    const movilLabel = select.closest('label') as HTMLElement;
    expect(within(movilLabel).getByText('sugerido por IA')).toBeInTheDocument();

    const kmInput = screen.getByRole('spinbutton', { name: 'Kilometraje' }) as HTMLInputElement;
    expect(kmInput.value).toBe('45210');
    const kmLabel = kmInput.closest('label') as HTMLElement;
    expect(within(kmLabel).getByText('sugerido por IA')).toBeInTheDocument();
  });

  it('muestra el hint de patente sin match cuando no hay movilId sugerido', async () => {
    extraerTicket.mockResolvedValue(extraccionBase({ patente: 'XX 999 XX', movilId: null }));
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      expect(
        screen.getByText('Patente leída: «XX 999 XX» — no está en el maestro de móviles.'),
      ).toBeInTheDocument();
    });
    const select = screen.getByRole('combobox', { name: 'Móvil' }) as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  it('muestra el hint de tipo leído cuando no matchea el catálogo', async () => {
    extraerTicket.mockResolvedValue(
      extraccionBase({ tipoCombustibleLeido: 'INFINIA DIESEL', tipoCombustibleId: null }),
    );
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      expect(screen.getByText(/Tipo leído del ticket: «INFINIA DIESEL»/)).toBeInTheDocument();
    });
    expect(screen.getByText(/agregarlo como alias/i)).toBeInTheDocument();
  });

  it('muestra el hint de CUIT leído formateado cuando no matchea el maestro', async () => {
    extraerTicket.mockResolvedValue(
      extraccionBase({ cuitEstacionLeido: '30999999995', estacionId: null }),
    );
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      expect(screen.getByText(/CUIT leído: 30-99999999-5/)).toBeInTheDocument();
    });
    expect(screen.getByText(/no está en el maestro de estaciones/)).toBeInTheDocument();
  });

  it('no muestra hints cuando el tipo y la estación sí matchearon', async () => {
    extraerTicket.mockResolvedValue(
      extraccionBase({
        tipoCombustibleId: 1,
        tipoCombustibleLeido: 'Diesel',
        estacionId: 1,
        cuitEstacionLeido: '30111111118',
      }),
    );
    render(<NuevaCargaCombustiblePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sacar foto del ticket' }));

    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: 'Tipo de combustible' }) as HTMLSelectElement;
      expect(select.value).toBe('1');
    });
    expect(screen.queryByText(/Tipo leído del ticket/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CUIT leído/)).not.toBeInTheDocument();
  });
});
