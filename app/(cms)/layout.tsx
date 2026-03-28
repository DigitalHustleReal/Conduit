'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AuthGuard } from '@/components/AuthGuard';
import { OnboardingGate } from '@/components/OnboardingGate';
import { CommandPalette } from '@/components/CommandPalette';
import { useState, useCallback } from 'react';

export default function CMSLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <AuthGuard>
      <OnboardingGate>
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
          <Sidebar open={sidebarOpen} onClose={closeSidebar} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Topbar onMenuClick={openSidebar} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
          </div>
          <CommandPalette />
        </div>
      </OnboardingGate>
    </AuthGuard>
  );
}
