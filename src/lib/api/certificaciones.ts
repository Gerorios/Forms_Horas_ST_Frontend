import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { getToken } from './token';

// Cliente aparte del `api` de Horas (NestJS): el portal de Certificaciones es
// un backend FastAPI propio (mismo token Bearer, distinto host/baseURL).
export const apiCert = axios.create({
  baseURL: process.env.NEXT_PUBLIC_CERT_API_URL ?? 'http://localhost:8000',
});

apiCert.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getCert = async <T>(url: string, params?: Record<string, unknown>) =>
  (await apiCert.get<T>(url, params ? { params } : undefined)).data;

// ---- GET /certificaciones/resumen (FastAPI) ----
export interface FilaResumenCert {
  periodo: string;
  contrato: string;
  tipo: string;
  lineas: number;
  monto_total: number;
}

/** El backend NO filtra por período (devuelve las últimas ~200 filas de
 * TODOS los períodos, orden desc, cada fila trae su `periodo`) — el filtro
 * por período seleccionado se hace client-side acá. Si el volumen crece,
 * agregar filtro server-side (query param real en el endpoint). */
export function useResumenCert(periodo: string) {
  return useQuery({
    queryKey: ['certificaciones', 'resumen'],
    queryFn: () => getCert<FilaResumenCert[]>('/certificaciones/resumen'),
    select: (filas) => filas.filter((f) => f.periodo === periodo),
    enabled: periodo !== '',
  });
}

// ---- GET /analytics/estado-cargas (FastAPI) ----
export interface EstadoCargaContrato {
  contrato: string;
  periodo: string;
  cargado: boolean;
  usuario: string | null;
  cargado_en: string | null;
  filas_cargadas: number;
  estado: string;
}

/** El backend devuelve TODO el histórico contrato×período desde 2025-01 (no
 * acepta filtro) — el filtro por período seleccionado se hace client-side
 * acá, mismo criterio que `useResumenCert`. */
export function useEstadoCargas(periodo: string) {
  return useQuery({
    queryKey: ['certificaciones', 'estado-cargas'],
    queryFn: () => getCert<EstadoCargaContrato[]>('/analytics/estado-cargas'),
    select: (filas) => filas.filter((f) => f.periodo === periodo),
    enabled: periodo !== '',
  });
}

// ---- GET /analytics/presupuesto (FastAPI) — lista, una fila por contrato;
// 403 para nivel 'carga' ----
export interface PresupuestoContrato {
  contrato: string;
  descripcion: string;
  periodo_desde: string;
  periodo_hasta: string;
  monto_presupuesto: number;
  consumido: number;
  pct: number;
}

export function usePresupuesto() {
  return useQuery({
    queryKey: ['certificaciones', 'presupuesto'],
    queryFn: () => getCert<PresupuestoContrato[]>('/analytics/presupuesto'),
    retry: false, // 403 no corresponde reintentar (nivel 'carga' sin el permiso)
  });
}

// ---- GET /certificaciones/incidencia-mo (backend de Horas, axios `api`) ----
export interface IncidenciaMoResponse {
  contratos: { codigo: string; montoMo: number }[];
  sinAsignar: number | null;
}

export function useIncidenciaMo(anio: number, mes: number, enabled = true) {
  return useQuery({
    queryKey: ['certificaciones', 'incidencia-mo', anio, mes],
    queryFn: () => api.get<IncidenciaMoResponse>('/certificaciones/incidencia-mo', { params: { anio, mes } }).then((r) => r.data),
    enabled,
    retry: false, // 403 si el usuario no corresponde (ver perfil.cert.inc)
  });
}
