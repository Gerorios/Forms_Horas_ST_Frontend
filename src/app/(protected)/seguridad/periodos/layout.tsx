import type { ReactNode } from 'react';
import { SoloHysAdmin } from '@/features/seguridad/solo-hys-admin';

export default function PeriodosLayout({ children }: { children: ReactNode }) {
  return <SoloHysAdmin href="/seguridad/periodos">{children}</SoloHysAdmin>;
}
