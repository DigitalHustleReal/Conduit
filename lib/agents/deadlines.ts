/**
 * Deadline Tracker -- ensures content moves through the pipeline
 * on schedule. Escalates when things are stuck.
 */

import type { ContentPlan } from '@/lib/autopilot/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Deadline {
  contentId: string;
  title: string;
  stage: string;
  dueDate: number;
  assignedAgent: string;
  status: 'on-track' | 'at-risk' | 'overdue';
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Set a deadline for a content item
// ---------------------------------------------------------------------------

export function setDeadline(
  contentId: string,
  title: string,
  stage: string,
  dueDate: number,
  agent: string,
): Deadline {
  const now = Date.now();
  const timeLeft = dueDate - now;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  let status: Deadline['status'] = 'on-track';
  if (timeLeft < 0) status = 'overdue';
  else if (timeLeft < ONE_DAY) status = 'at-risk';

  return {
    contentId,
    title,
    stage,
    dueDate,
    assignedAgent: agent,
    status,
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// Check all deadlines and return alerts
// ---------------------------------------------------------------------------

export function checkDeadlines(
  deadlines: Deadline[],
): { onTrack: number; atRisk: number; overdue: number; alerts: string[] } {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const alerts: string[] = [];
  let onTrack = 0;
  let atRisk = 0;
  let overdue = 0;

  for (const d of deadlines) {
    const timeLeft = d.dueDate - now;

    if (timeLeft < 0) {
      d.status = 'overdue';
      overdue++;
      const daysOverdue = Math.ceil(Math.abs(timeLeft) / ONE_DAY);
      alerts.push(`OVERDUE: "${d.title}" (${d.stage}) is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past deadline`);
    } else if (timeLeft < ONE_DAY) {
      d.status = 'at-risk';
      atRisk++;
      const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000));
      alerts.push(`AT RISK: "${d.title}" (${d.stage}) due in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`);
    } else {
      d.status = 'on-track';
      onTrack++;
    }
  }

  return { onTrack, atRisk, overdue, alerts };
}

// ---------------------------------------------------------------------------
// Auto-set deadlines based on content plans
// ---------------------------------------------------------------------------

export function autoSchedule(plans: ContentPlan[]): Deadline[] {
  const deadlines: Deadline[] = [];
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // Stage durations (in days from plan creation)
  const stageDurations: Record<string, { days: number; agent: string }> = {
    brief: { days: 1, agent: 'brief-generator' },
    draft: { days: 3, agent: 'draft-writer' },
    review: { days: 4, agent: 'editor' },
    published: { days: 7, agent: 'distribution-agent' },
  };

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    // Stagger plans by 2 days each
    const baseTime = now + (i * 2 * ONE_DAY);

    for (const [stage, config] of Object.entries(stageDurations)) {
      deadlines.push(
        setDeadline(
          `plan-${i}-${plan.keyword}`,
          plan.title,
          stage,
          baseTime + (config.days * ONE_DAY),
          config.agent,
        ),
      );
    }
  }

  return deadlines;
}

// ---------------------------------------------------------------------------
// Get deadlines due within N days
// ---------------------------------------------------------------------------

export function getUpcomingDeadlines(
  deadlines: Deadline[],
  withinDays: number = 7,
): Deadline[] {
  const now = Date.now();
  const cutoff = now + (withinDays * 24 * 60 * 60 * 1000);

  return deadlines
    .filter((d) => d.dueDate <= cutoff)
    .sort((a, b) => a.dueDate - b.dueDate);
}
