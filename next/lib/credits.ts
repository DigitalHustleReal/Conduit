import type { Credits } from '@/types/workspace';
import { PLAN_LIMITS } from '@/stores/workspace';

export type PlanType = 'free' | 'pro' | 'business';

export function getPlanLimits(plan: PlanType) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function isBYOK(settings: { openaiKey?: string; geminiKey?: string; mistralKey?: string; groqKey?: string }): boolean {
  return !!(settings.openaiKey || settings.geminiKey || settings.mistralKey || settings.groqKey);
}

export function shouldResetCredits(credits: Credits): boolean {
  return Date.now() >= (credits.resetDate || 0);
}

export function resetCredits(credits: Credits): Credits {
  return {
    ...credits,
    aiCalls: 0,
    apiReqs: 0,
    socialPosts: 0,
    resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime(),
  };
}

export function canUseCredit(credits: Credits, plan: PlanType, type: keyof typeof PLAN_LIMITS.free = 'aiCalls'): boolean {
  const limits = getPlanLimits(plan);
  const current = (credits[type as keyof Credits] as number) || 0;
  const limit = (limits as Record<string, number>)[type] || 100;
  return current < limit;
}

export function getCreditPercentage(credits: Credits, plan: PlanType): number {
  const limits = getPlanLimits(plan);
  return Math.min(((credits.aiCalls || 0) / limits.aiCalls) * 100, 100);
}
