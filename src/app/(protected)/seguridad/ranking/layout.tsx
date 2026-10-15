import type { ReactNode } from 'react';
import { SoloHysAdmin } from '@/features/seguridad/solo-hys-admin';

export default function RankingLayout({ children }: { children: ReactNode }) {
  return <SoloHysAdmin href="/seguridad/ranking">{children}</SoloHysAdmin>;
}
