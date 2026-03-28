/**
 * Agent Runtime -- real autonomous agents, not prompt wrappers.
 *
 * Each agent has:
 * - MEMORY: What it did before, what worked, what the user prefers
 * - PERCEPTION: What's happening now (scores, rankings, content state, time)
 * - REASONING: Decides what to do based on memory + perception + goals
 * - ACTION: Executes the decision (AI call, data update, queue item)
 * - LEARNING: Updates memory based on outcomes
 */

import { callAI } from '@/lib/ai/call-ai';
import type { QueueItemType } from '@/lib/autopilot/queue';
import type { ContentItem, Keyword } from '@/types/content';

// ---------------------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------------------

export interface AgentMemory {
  id: string;
  totalRuns: number;
  totalActions: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;                    // 0-1, tracks user trust
  lastRun: number;                         // timestamp
  lastAction: string;                      // what it did last
  recentDecisions: AgentDecision[];        // last 20 decisions with outcomes
  userPreferences: Record<string, string>; // learned: "title_length: long", "tone: professional"
  avoidPatterns: string[];                 // things user rejected: "don't suggest crypto topics"
  successPatterns: string[];               // things user approved: "comparison articles perform well"
  environmentSnapshot: Record<string, unknown>; // last known state of the world
}

export interface AgentDecision {
  timestamp: number;
  perception: string;      // what the agent saw
  reasoning: string;       // why it decided to act
  action: string;          // what it did
  outcome: 'pending' | 'approved' | 'rejected' | 'auto-applied';
  userFeedback?: string;   // rejection reason if rejected
}

export interface AgentPerception {
  // Content state
  totalContent: number;
  publishedCount: number;
  draftCount: number;
  avgSEOScore: number;
  avgAIScore: number;
  lowSEOContent: Array<{ id: number; slug: string; seoScore: number }>;
  staleContent: Array<{ id: number; slug: string; daysSinceUpdate: number }>;

  // Keyword state
  totalKeywords: number;
  keywordsWithoutContent: string[];

  // Performance (if GSC connected)
  decliningContent: string[];
  lowCTRContent: string[];

  // Time context
  currentDate: string;
  dayOfWeek: string;
  hourOfDay: number;
  daysSinceLastRun: number;

  // User context
  niche: string;
  domain: string;
  competitors: string[];
  userApprovalRate: number;

  // Review queue state
  pendingItems: number;
  pendingByType: Record<string, number>;
}

export interface AgentGoal {
  metric: string;
  target: number;
  current: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface AgentRunResult {
  agentId: string;
  acted: boolean;
  action: string;
  reasoning: string;
  confidence: number;
  creditsUsed: number;
  queueItemId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Workspace store shape (minimal interface to avoid circular imports)
// ---------------------------------------------------------------------------

export interface AgentWorkspaceView {
  content: ContentItem[];
  keywords: Keyword[];
  niche: string;
  domain: string;
  competitors: string[];
  reviewQueue: Array<{ status: string; type: string }>;
  settings: Record<string, string>;
  deductCredit: (type?: string) => boolean;
  addToQueue: (item: {
    type: QueueItemType;
    title: string;
    description: string;
    agentId: string;
    data: Record<string, unknown>;
    preview?: string;
    impact: 'low' | 'medium' | 'high';
  }) => { id: string };
  logAgentRun: (agentId: string, action: string, result: unknown, credits: number) => void;
}

// ---------------------------------------------------------------------------
// Helper: create empty memory
// ---------------------------------------------------------------------------

export function createEmptyMemory(id: string): AgentMemory {
  return {
    id,
    totalRuns: 0,
    totalActions: 0,
    totalApproved: 0,
    totalRejected: 0,
    approvalRate: 1,
    lastRun: 0,
    lastAction: 'none',
    recentDecisions: [],
    userPreferences: {},
    avoidPatterns: [],
    successPatterns: [],
    environmentSnapshot: {},
  };
}

// ---------------------------------------------------------------------------
// Helper: perceive from workspace data
// ---------------------------------------------------------------------------

export function perceiveWorkspace(
  store: AgentWorkspaceView,
  memory: AgentMemory,
): AgentPerception {
  const now = Date.now();
  const content = store.content;
  const published = content.filter((c) => c.status === 'published');
  const drafts = content.filter((c) => c.status === 'draft');
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;

  const seoScores = content.map((c) => c.seoScore ?? 0);
  const aiScores = content.map((c) => c.aiScore ?? 0);
  const avgSEO = seoScores.length > 0 ? seoScores.reduce((a, b) => a + b, 0) / seoScores.length : 0;
  const avgAI = aiScores.length > 0 ? aiScores.reduce((a, b) => a + b, 0) / aiScores.length : 0;

  const lowSEO = content
    .filter((c) => (c.seoScore ?? 0) < 50)
    .map((c) => ({ id: c.id, slug: c.slug ?? c.title, seoScore: c.seoScore ?? 0 }));

  const stale = content
    .filter((c) => c.status === 'published' && (now - c.updated) > SIXTY_DAYS)
    .map((c) => ({
      id: c.id,
      slug: c.slug ?? c.title,
      daysSinceUpdate: Math.floor((now - c.updated) / (24 * 60 * 60 * 1000)),
    }));

  // Keywords without matching content
  const contentKeywords = new Set(
    content.map((c) => (c.keyword ?? '').toLowerCase()).filter(Boolean),
  );
  const kwWithout = store.keywords
    .filter((kw) => !contentKeywords.has(kw.keyword.toLowerCase()))
    .map((kw) => kw.keyword);

  // Queue stats
  const pending = store.reviewQueue.filter((q) => q.status === 'pending');
  const pendingByType: Record<string, number> = {};
  for (const item of pending) {
    pendingByType[item.type] = (pendingByType[item.type] ?? 0) + 1;
  }

  const d = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    totalContent: content.length,
    publishedCount: published.length,
    draftCount: drafts.length,
    avgSEOScore: Math.round(avgSEO),
    avgAIScore: Math.round(avgAI),
    lowSEOContent: lowSEO,
    staleContent: stale,
    totalKeywords: store.keywords.length,
    keywordsWithoutContent: kwWithout,
    decliningContent: [],
    lowCTRContent: [],
    currentDate: d.toISOString().split('T')[0],
    dayOfWeek: dayNames[d.getDay()],
    hourOfDay: d.getHours(),
    daysSinceLastRun: memory.lastRun > 0
      ? Math.floor((now - memory.lastRun) / (24 * 60 * 60 * 1000))
      : 999,
    niche: store.niche || 'general',
    domain: store.domain || '',
    competitors: store.competitors || [],
    userApprovalRate: memory.approvalRate,
    pendingItems: pending.length,
    pendingByType,
  };
}

// ---------------------------------------------------------------------------
// ConduitAgent -- the core agent class
// ---------------------------------------------------------------------------

export type AgentReasonFn = (
  perception: AgentPerception,
  memory: AgentMemory,
  goals: AgentGoal[],
) => Promise<{ shouldAct: boolean; action: string; reasoning: string; confidence: number }>;

export type AgentActFn = (
  action: string,
  perception: AgentPerception,
  store: AgentWorkspaceView,
  settings: Record<string, string>,
  memory: AgentMemory,
) => Promise<{
  success: boolean;
  result: { queueType: QueueItemType; title: string; description: string; data: Record<string, unknown>; preview?: string; impact: 'low' | 'medium' | 'high' };
  creditsUsed: number;
}>;

export class ConduitAgent {
  id: string;
  name: string;
  role: string;
  goals: AgentGoal[];
  memory: AgentMemory;
  reasonFn: AgentReasonFn;
  actFn: AgentActFn;

  constructor(
    id: string,
    name: string,
    role: string,
    goals: AgentGoal[],
    reasonFn: AgentReasonFn,
    actFn: AgentActFn,
  ) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.goals = goals;
    this.memory = createEmptyMemory(id);
    this.reasonFn = reasonFn;
    this.actFn = actFn;
  }

  /** Load persisted memory */
  loadMemory(mem: AgentMemory | undefined): void {
    if (mem) {
      this.memory = mem;
    }
  }

  /** PERCEIVE: Read the current environment */
  perceive(store: AgentWorkspaceView): AgentPerception {
    return perceiveWorkspace(store, this.memory);
  }

  /** REASON: Decide what to do based on memory + perception + goals */
  async reason(perception: AgentPerception): Promise<{
    shouldAct: boolean;
    action: string;
    reasoning: string;
    confidence: number;
  }> {
    // Skip if too many pending items from this agent
    const myPending = perception.pendingByType;
    const totalMyPending = Object.values(myPending).reduce((a, b) => a + b, 0);
    if (totalMyPending > 5) {
      return {
        shouldAct: false,
        action: 'wait',
        reasoning: 'Too many pending items in review queue. Waiting for user to review.',
        confidence: 1,
      };
    }

    // If user approval rate is very low, be conservative
    if (this.memory.approvalRate < 0.3 && this.memory.totalActions > 5) {
      return {
        shouldAct: false,
        action: 'wait',
        reasoning: `Low approval rate (${Math.round(this.memory.approvalRate * 100)}%). Pausing to avoid generating unwanted suggestions. User should adjust agent settings or provide feedback.`,
        confidence: 1,
      };
    }

    return this.reasonFn(perception, this.memory, this.goals);
  }

  /** ACT: Execute the decided action */
  async act(
    action: string,
    perception: AgentPerception,
    store: AgentWorkspaceView,
    settings: Record<string, string>,
  ): Promise<{
    success: boolean;
    result: {
      queueType: QueueItemType;
      title: string;
      description: string;
      data: Record<string, unknown>;
      preview?: string;
      impact: 'low' | 'medium' | 'high';
    };
    creditsUsed: number;
  }> {
    return this.actFn(action, perception, store, settings, this.memory);
  }

  /** LEARN: Update memory based on action outcomes */
  learn(decision: AgentDecision): void {
    // Add to recent decisions (cap at 20)
    this.memory.recentDecisions = [
      decision,
      ...this.memory.recentDecisions,
    ].slice(0, 20);

    this.memory.lastAction = decision.action;

    if (decision.outcome === 'approved' || decision.outcome === 'auto-applied') {
      this.memory.totalApproved++;

      // Extract success patterns from the action description
      const actionLower = decision.action.toLowerCase();
      if (actionLower.length > 10 && !this.memory.successPatterns.includes(actionLower)) {
        this.memory.successPatterns = [
          actionLower,
          ...this.memory.successPatterns,
        ].slice(0, 20);
      }
    }

    if (decision.outcome === 'rejected') {
      this.memory.totalRejected++;

      // Extract avoid patterns from rejection feedback
      if (decision.userFeedback) {
        const feedback = decision.userFeedback.toLowerCase();
        if (feedback.length > 5 && !this.memory.avoidPatterns.includes(feedback)) {
          this.memory.avoidPatterns = [
            feedback,
            ...this.memory.avoidPatterns,
          ].slice(0, 20);
        }
      }

      // Also extract avoid pattern from the action itself if rejected
      const actionLower = decision.action.toLowerCase();
      if (actionLower.length > 10 && !this.memory.avoidPatterns.includes(actionLower)) {
        this.memory.avoidPatterns = [
          actionLower,
          ...this.memory.avoidPatterns,
        ].slice(0, 30);
      }
    }

    // Recalculate approval rate
    const total = this.memory.totalApproved + this.memory.totalRejected;
    this.memory.approvalRate = total > 0
      ? this.memory.totalApproved / total
      : 1;
  }

  /** RUN: Full cycle -- perceive -> reason -> act -> queue for review */
  async run(
    store: AgentWorkspaceView,
    settings: Record<string, string>,
  ): Promise<AgentRunResult> {
    this.memory.totalRuns++;
    this.memory.lastRun = Date.now();

    // 1. PERCEIVE
    const perception = this.perceive(store);

    // Update goals with current values from perception
    this.updateGoalsFromPerception(perception);

    // Save environment snapshot
    this.memory.environmentSnapshot = {
      totalContent: perception.totalContent,
      avgSEOScore: perception.avgSEOScore,
      pendingItems: perception.pendingItems,
      timestamp: Date.now(),
    };

    // 2. REASON
    let decision;
    try {
      decision = await this.reason(perception);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        agentId: this.id,
        acted: false,
        action: 'reason_error',
        reasoning: `Reasoning failed: ${errMsg}`,
        confidence: 0,
        creditsUsed: 0,
        error: errMsg,
      };
    }

    if (!decision.shouldAct) {
      store.logAgentRun(this.id, 'no_action', { reasoning: decision.reasoning }, 0);
      return {
        agentId: this.id,
        acted: false,
        action: decision.action,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        creditsUsed: 0,
      };
    }

    // 3. ACT
    let actResult;
    try {
      actResult = await this.act(decision.action, perception, store, settings);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      store.logAgentRun(this.id, decision.action, { error: errMsg }, 0);
      return {
        agentId: this.id,
        acted: false,
        action: decision.action,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        creditsUsed: 0,
        error: errMsg,
      };
    }

    if (!actResult.success) {
      store.logAgentRun(this.id, decision.action, { error: 'Action failed' }, actResult.creditsUsed);
      return {
        agentId: this.id,
        acted: false,
        action: decision.action,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        creditsUsed: actResult.creditsUsed,
        error: 'Action execution failed',
      };
    }

    // 4. Queue for review
    this.memory.totalActions++;
    const queueItem = store.addToQueue({
      type: actResult.result.queueType,
      title: actResult.result.title,
      description: actResult.result.description,
      agentId: this.id,
      data: actResult.result.data,
      preview: actResult.result.preview,
      impact: actResult.result.impact,
    });

    // Record the pending decision (will be updated when user reviews)
    const agentDecision: AgentDecision = {
      timestamp: Date.now(),
      perception: this.summarizePerception(perception),
      reasoning: decision.reasoning,
      action: actResult.result.title,
      outcome: 'pending',
    };
    this.memory.recentDecisions = [
      agentDecision,
      ...this.memory.recentDecisions,
    ].slice(0, 20);
    this.memory.lastAction = actResult.result.title;

    // Deduct credits if any were used
    if (actResult.creditsUsed > 0) {
      store.deductCredit('aiCalls');
    }

    store.logAgentRun(this.id, decision.action, {
      title: actResult.result.title,
      queueItemId: queueItem.id,
    }, actResult.creditsUsed);

    return {
      agentId: this.id,
      acted: true,
      action: decision.action,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      creditsUsed: actResult.creditsUsed,
      queueItemId: queueItem.id,
    };
  }

  /** Get agent status for UI display */
  getStatus(): {
    lastRun: string;
    approvalRate: number;
    totalActions: number;
    totalRuns: number;
    totalApproved: number;
    totalRejected: number;
    recentInsight: string;
    goals: AgentGoal[];
    successPatterns: string[];
    avoidPatterns: string[];
    userPreferences: Record<string, string>;
  } {
    const lastRun = this.memory.lastRun > 0
      ? new Date(this.memory.lastRun).toLocaleString()
      : 'Never';

    // Generate a recent insight from memory
    let recentInsight = 'No insights yet. Run the agent to start learning.';
    if (this.memory.successPatterns.length > 0) {
      recentInsight = `Learned: "${this.memory.successPatterns[0]}" works well`;
    } else if (this.memory.avoidPatterns.length > 0) {
      recentInsight = `Learned to avoid: "${this.memory.avoidPatterns[0]}"`;
    } else if (this.memory.totalRuns > 0) {
      recentInsight = `Last action: ${this.memory.lastAction}`;
    }

    return {
      lastRun,
      approvalRate: this.memory.approvalRate,
      totalActions: this.memory.totalActions,
      totalRuns: this.memory.totalRuns,
      totalApproved: this.memory.totalApproved,
      totalRejected: this.memory.totalRejected,
      recentInsight,
      goals: this.goals,
      successPatterns: this.memory.successPatterns,
      avoidPatterns: this.memory.avoidPatterns,
      userPreferences: this.memory.userPreferences,
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private updateGoalsFromPerception(perception: AgentPerception): void {
    for (const goal of this.goals) {
      switch (goal.metric) {
        case 'avg_seo_score':
          goal.current = perception.avgSEOScore;
          break;
        case 'low_seo_count':
          goal.current = perception.lowSEOContent.length;
          break;
        case 'keyword_coverage': {
          const total = perception.totalKeywords;
          const uncovered = perception.keywordsWithoutContent.length;
          goal.current = total > 0 ? Math.round(((total - uncovered) / total) * 100) : 0;
          break;
        }
        case 'keywords_tracked':
          goal.current = perception.totalKeywords;
          break;
        case 'stale_content_count':
          goal.current = perception.staleContent.length;
          break;
        case 'declining_content':
          goal.current = perception.decliningContent.length;
          break;
        case 'orphan_pages':
          // placeholder until real interlink data
          goal.current = 0;
          break;
        default:
          break;
      }
    }
  }

  private summarizePerception(p: AgentPerception): string {
    return `${p.totalContent} articles (${p.publishedCount} published, ${p.draftCount} drafts), avg SEO: ${p.avgSEOScore}, ${p.lowSEOContent.length} low SEO, ${p.staleContent.length} stale, ${p.keywordsWithoutContent.length} uncovered keywords`;
  }
}

// ---------------------------------------------------------------------------
// AI helper for agents that need nuanced decisions
// ---------------------------------------------------------------------------

export async function agentAICall(
  prompt: string,
  system: string,
  settings: Record<string, string>,
): Promise<string> {
  return callAI(prompt, {
    system,
    maxTokens: 800,
  }, settings);
}
