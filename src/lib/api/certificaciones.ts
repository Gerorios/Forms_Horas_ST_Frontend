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

export function useResumenCert(periodo: string) {
  return useQuery({
    queryKey: ['certificaciones', 'resumen', periodo],
    queryFn: () => getCert<FilaResumenCert[]>('/certificaciones/resumen', { periodo }),
    enabled: periodo !== '',
  });
}

// ---- GET /analytics/estado-cargas (FastAPI) ----
export interface EstadoCargaContrato {
  contrato: string;
  cargado: boolean;
}

export function useEstadoCargas() {
  return useQuery({
    queryKey: ['certificaciones', 'estado-cargas'],
    queryFn: () => getCert<EstadoCargaContrato[]>('/analytics/estado-cargas'),
  });
}

// ---- GET /analytics/presupuesto (FastAPI) — 403 para nivel 'carga' ----
export interface PresupuestoResumen {
  periodo: string;
  presupuestado: number;
  certificado: number;
  pctEjecutado: number;
}

export function usePresupuesto() {
  return useQuery({
    queryKey: ['certificaciones', 'presupuesto'],
    queryFn: () => getCert<PresupuestoResumen>('/analytics/presupuesto'),
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
