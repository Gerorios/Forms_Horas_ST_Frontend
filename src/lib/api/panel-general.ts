import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Quincena } from '@/lib/quincena';

export interface ResumenOperario {
  cuil: string;
  apellido_nombre: string;
  totalHoras: number;
  pendiente: number;
  aprobado: number;
  desaprobado: number;
  superaHorasExtra: boolean;
}

export interface OperarioSinCarga {
  cuil: string;
  apellido_nombre: string;
  legajo: number;
  cargo: string;
}

export function useResumenOperarios(quincena: Quincena) {
  return useQuery({
    queryKey: ['resumen-operarios', quincena],
    queryFn: async () =>
      (
        await api.get<ResumenOperario[]>('/registros-horas/resumen-operarios', {
          params: { anio: quincena.anio, mes: quincena.mes, quincena: quincena.parte },
        })
      ).data,
  });
}

export function useSinCarga(quincena: Quincena) {
  return useQuery({
    queryKey: ['sin-carga', quincena],
    queryFn: async () =>
      (
        await api.get<OperarioSinCarga[]>('/registros-horas/sin-carga', {
          params: { anio: quincena.anio, mes: quincena.mes, quincena: quincena.parte },
        })
      ).data,
  });
}
