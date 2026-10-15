import type { ReactNode } from 'react';
import { SoloHysAdmin } from '@/features/seguridad/solo-hys-admin';

export default function InspectoresLayout({ children }: { children: ReactNode }) {
  return <SoloHysAdmin href="/seguridad/inspectores">{children}</SoloHysAdmin>;
}
