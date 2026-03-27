'use client';

import { useWorkspace } from '@/stores/workspace';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import type { ReactNode } from 'react';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const onboardingComplete = useWorkspace((s) => s.onboardingComplete);

  return (
    <>
      {!onboardingComplete && <OnboardingWizard />}
      {children}
    </>
  );
}
