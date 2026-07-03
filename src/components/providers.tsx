'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { SessionProvider } from '@/lib/auth/session';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <SessionProvider>
        {children}
        <Toaster richColors position="top-center" />
      </SessionProvider>
    </QueryClientProvider>
  );
}
