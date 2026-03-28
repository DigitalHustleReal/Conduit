/**
 * Scheduler that runs the feedback loop periodically.
 *
 * In a real deployment this would be a cron job or background worker.
 * In the client-side app, it runs when the user opens the dashboard
 * or the performance page, collecting signals, analyzing them, and
 * queuing actions for review.
 */

import type { ContentItem } from '@/types/content';
import type { GSCQuery } from '@/lib/gsc';
import type { AgentFeedbackEntry } from '@/types/agent';
import {
  collectSignals,
  analyzePerformance,
  generateActions,
  learnFromFeedback,
  getFeedbackSummary,
} from './feedback';
import type {
  PerformanceSignal,
  FeedbackInsight,
  QueueItem,
  AgentLearning,
  FeedbackSummary,
} from './feedback';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal interface for the workspace store fields used by the scheduler. */
export interface SchedulerStore {
  content: ContentItem[];
  agentFeedback: AgentFeedbackEntry[];
  settings: {
    gscRefreshToken?: string;
    gscSiteUrl?: string;
    gscConnectedAt?: string;
  };
}

export interface FeedbackCycleResult {
  signals: number;
  insights: number;
  actionsQueued: number;
  summary: FeedbackSummary;
  insightsList: FeedbackInsight[];
  actions: QueueItem[];
  learning: AgentLearning;
}

export interface CycleResult {
  feedbackResult: FeedbackCycleResult;
  timestamp: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// Feedback cycle
// ---------------------------------------------------------------------------

/**
 * Run on dashboard / performance page load.
 * Collects signals from content + optional GSC data, analyzes them,
 * and queues actions for user review.
 *
 * This is the core feedback loop entry point.
 */
export function runFeedbackCycle(
  store: SchedulerStore,
  gscData?: GSCQuery[],
): FeedbackCycleResult {
  // Step 1: Collect performance signals
  const signals: PerformanceSignal[] = collectSignals(store.content, gscData);

  // Step 2: Analyze and generate insights
  const insightsList: FeedbackInsight[] = analyzePerformance(signals);

  // Step 3: Create review queue items
  const actions: QueueItem[] = generateActions(insightsList);

  // Step 4: Learn from past feedback
  const approvedItems = actions.filter((a) => a.status === 'approved');
  const rejectedItems = actions.filter((a) => a.status === 'rejected');
  const learning: AgentLearning = learnFromFeedback(
    approvedItems,
    rejectedItems,
    store.agentFeedback,
  );

  // Step 5: Summary for dashboard cards
  const summary: FeedbackSummary = getFeedbackSummary(signals);

  return {
    signals: signals.length,
    insights: insightsList.length,
    actionsQueued: actions.length,
    summary,
    insightsList,
    actions,
    learning,
  };
}

/**
 * Run the full autopilot cycle: discovery + planning + generation + feedback.
 *
 * In a client-side context this is triggered manually or on page load.
 * The actual AI-powered phases (discovery, planning, generation) are handled
 * by the engine module. This scheduler wraps the feedback loop around them.
 */
export function runFullCycle(
  store: SchedulerStore,
  gscData?: GSCQuery[],
): CycleResult {
  const start = Date.now();

  // Run the feedback portion (synchronous -- no AI calls needed)
  const feedbackResult = runFeedbackCycle(store, gscData);

  return {
    feedbackResult,
    timestamp: Date.now(),
    duration: Date.now() - start,
  };
}
