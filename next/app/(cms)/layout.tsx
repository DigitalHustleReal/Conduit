import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AuthGuard } from '@/components/AuthGuard';
import { OnboardingGate } from '@/components/OnboardingGate';

export default function CMSLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <OnboardingGate>
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </OnboardingGate>
    </AuthGuard>
  );
}
