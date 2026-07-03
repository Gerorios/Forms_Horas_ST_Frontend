import { api } from './client';
import type { LoginResponse, Perfil } from '@/types/domain';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function fetchPerfil(): Promise<Perfil> {
  const { data } = await api.get<Perfil>('/auth/perfil');
  return data;
}
