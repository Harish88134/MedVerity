'use client';

import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { AlarmProvider } from '@/context/AlarmContext';
import NavigationShell from '@/components/ui/NavigationShell';
import AlarmModal from '@/components/alarm/AlarmModal';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AlarmProvider>
        <NavigationShell>{children}</NavigationShell>
        <AlarmModal />
      </AlarmProvider>
    </AuthProvider>
  );
}
