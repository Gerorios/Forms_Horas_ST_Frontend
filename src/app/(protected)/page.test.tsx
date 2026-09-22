import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Perfil } from '@/types/domain';

// El perfil del mock es mutable (vi.hoisted) para montar el inicio con otro
// rol —HyS no ve el área Operación, y solo un perfil con claim `cert` ve la
// tarjeta de Certificaciones— sin remontar el módulo.
type PerfilMock = Pick<
  Perfil,
  'cuil' | 'rol' | 'tiposNovedadHabilitados' | 'puedeCargarKmPorTantos' | 'cert'
> & { empleado: { apellido_nombre: string } };
/** Registros de "Mis registros" del operario, también mutables: el tile
 * "Horas cargadas" los suma en el inicio. */
type RegistroMock = { estado: string; horas: string };
const h = vi.hoisted(() => ({
  perfil: null as PerfilMock | null,
  registros: null as RegistroMock[] | null,
}));

const PERFIL_ADMIN = {
  cuil: '20123456789',
  email: 'admin@empresa.com',
  activo: true,
  rol: { nombre: 'Admin' as const },
  empleado: { apellido_nombre: 'PEREZ JUAN', legajo: 10, cargo: 'Oficial' },
  contratosHabilitados: [],
  tiposNovedadHabilitados: [],
  puedeCargarKmPorTantos: false,
  cert: null,
};

const PERFIL_ADMIN_CERT = {
  ...PERFIL_ADMIN,
  cert: { nivel: 'admin' as const, ks: ['K12'], inc: true },
};

const PERFIL_HYS = {
  cuil: '27123456780',
  email: 'hys@empresa.com',
  activo: true,
  rol: { nombre: 'HyS' as const },
  empleado: { apellido_nombre: 'GOMEZ ANA', legajo: 20, cargo: 'Higiene y Seguridad' },
  contratosHabilitados: [],
  tiposNovedadHabilitados: [],
  puedeCargarKmPorTantos: false,
  cert: null,
};

const PERFIL_OPERARIO = {
  cuil: '20111111111',
  email: 'operario@empresa.com',
  activo: true,
  rol: { nombre: 'Operario' as const },
  empleado: { apellido_nombre: 'LOPEZ CARLOS', legajo: 30, cargo: 'Oficial' },
  contratosHabilitados: [],
  tiposNovedadHabilitados: [],
  puedeCargarKmPorTantos: false,
  cert: null,
};

vi.mock('@/lib/auth/session', () => ({
  useSession: () => ({ perfil: h.perfil, signOut: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Los datos de los indicadores no son lo que se prueba acá (cada módulo tiene
// su test): los hooks devuelven vacío para que el inicio no pegue a la API.
// La excepción es `useMisRegistros`, que alimenta el tile "Horas cargadas".
vi.mock('@/lib/api/panel-general', () => ({
  useResumenOperarios: vi.fn(() => ({ data: undefined })),
  useSinCarga: vi.fn(() => ({ data: undefined })),
}));
vi.mock('@/lib/api/novedades', () => ({ useNovedades: vi.fn(() => ({ data: undefined })) }));
vi.mock('@/lib/api/liquidacion', () => ({ useAlertasQuincena: vi.fn(() => ({ data: undefined })) }));
vi.mock('@/lib/api/registros', () => ({
  useMisRegistros: vi.fn(() => ({ data: h.registros ?? undefined })),
}));

import HomePage from './page';

// Lunes 21/09/2026: 2ª quincena de septiembre.
beforeEach(() => {
  h.perfil = PERFIL_ADMIN;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-21T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Inicio — franja de bienvenida (2.3)', () => {
  it('saluda al usuario por su nombre', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Hola, PEREZ JUAN' })).toBeInTheDocument();
  });

  it('muestra la fecha de hoy y la quincena en curso', () => {
    render(<HomePage />);
    const linea = screen.getByText(/2ª quincena de septiembre 2026 en curso/);
    expect(linea).toHaveTextContent('21 de septiembre');
    // La fecha larga de Intl viene en minúscula ("lunes 21…"): va capitalizada.
    const inicial = linea.textContent?.trim().charAt(0) ?? '';
    expect(inicial).toBe(inicial.toUpperCase());
    // Sobre la franja el secundario es blanco al 80 %, nunca `text-slate`.
    expect(linea.className).toContain('text-white/80');
  });
});

describe('Inicio — módulos por área (2.3)', () => {
  it('un Admin ve las cuatro áreas como títulos', () => {
    render(<HomePage />);
    for (const area of ['Operación', 'Personas', 'Resultados operativos', 'Administración']) {
      expect(screen.getByRole('heading', { name: area })).toBeInTheDocument();
    }
  });

  it('un perfil de HyS no ve el área Operación', () => {
    h.perfil = PERFIL_HYS;
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Personas' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Operación' })).not.toBeInTheDocument();
  });

  it('la tarjeta de Certificaciones tiene su descripción (default 10)', () => {
    h.perfil = PERFIL_ADMIN_CERT;
    render(<HomePage />);
    const desc = screen.getByText(
      'Cargar y seguir las certificaciones por contrato: resumen, analytics, ítems e historial.',
    );
    expect(desc.closest('a')).toHaveAttribute('href', '/certificaciones');
  });
});

describe('Inicio — tile "Horas cargadas" (par E)', () => {
  // Guarda del refactor a `redondearHoras`: nace verde (el inline
  // `Math.round(horas * 10) / 10` hacía lo mismo) y deja fijado que la suma
  // en coma flotante 0.1 + 0.2 + 0.3 se muestra "0.6" y no
  // "0.6000000000000001".
  it('redondea a un decimal el total del operario', () => {
    h.perfil = PERFIL_OPERARIO;
    h.registros = [
      { estado: 'aprobado', horas: '0.1' },
      { estado: 'aprobado', horas: '0.2' },
      { estado: 'aprobado', horas: '0.3' },
    ];
    render(<HomePage />);
    const valor = screen.getByText('0.6');
    expect(valor.parentElement).toHaveTextContent('Horas cargadas');
  });
});
