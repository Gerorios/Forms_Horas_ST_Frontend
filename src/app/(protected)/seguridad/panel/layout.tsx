import type { ReactNode } from 'react';
import { SoloHysAdmin } from '@/features/seguridad/solo-hys-admin';

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <SoloHysAdmin href="/seguridad/panel">{children}</SoloHysAdmin>;
}
