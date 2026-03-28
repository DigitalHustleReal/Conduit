/**
 * Handoff System -- agents communicate through a message bus.
 * When one agent finishes, it can pass instructions to the next.
 *
 * Flow: Keyword Scout -> Content Strategist -> Brief Generator ->
 *       Draft Writer -> Editor -> Revision (if needed) -> Publisher
 *
 * Messages are stored in the Zustand store, processed on next agent run.
 */

import type { AutopilotEngineConfig } from '@/lib/autopilot/engine';
import type { AgentWorkspaceView } from './runtime';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentMessage {
  from: string;
  to: string;
  type: 'task' | 'info' | 'alert' | 'feedback';
  subject: string;
  data: Record<string, unknown>;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

export interface PipelineStage {
  agent: string;
  produces: string;
  next: string | null;
}

export interface PipelineResult {
  stages: Array<{
    agent: string;
    status: 'completed' | 'failed' | 'skipped';
    output: Record<string, unknown>;
    creditsUsed: number;
  }>;
  totalCredits: number;
  success: boolean;
  finalOutput: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Message bus (in-memory, synced to store via actions)
// ---------------------------------------------------------------------------

let messageStore: AgentMessage[] = [];

/** Post a message for another agent */
export function postMessage(msg: Omit<AgentMessage, 'timestamp'>): void {
  messageStore.push({ ...msg, timestamp: Date.now() });
  // Cap messages to prevent unbounded growth
  if (messageStore.length > 500) {
    messageStore = messageStore.slice(-300);
  }
}

/** Get pending messages for an agent */
export function getMessages(agentId: string): AgentMessage[] {
  return messageStore.filter(
    (m) => m.to === agentId || m.to === 'all',
  );
}

/** Clear messages after processing */
export function clearMessages(agentId: string): void {
  messageStore = messageStore.filter(
    (m) => m.to !== agentId && m.to !== 'all',
  );
}

/** Load messages from external store (called on init) */
export function loadMessages(msgs: AgentMessage[]): void {
  messageStore = msgs;
}

/** Get all messages for persistence */
export function getAllMessages(): AgentMessage[] {
  return [...messageStore];
}

// ---------------------------------------------------------------------------
// Content Pipeline definition
// ---------------------------------------------------------------------------

export const CONTENT_PIPELINE: PipelineStage[] = [
  { agent: 'keyword-scout', produces: 'keyword', next: 'content-strategist' },
  { agent: 'content-strategist', produces: 'plan', next: 'brief-generator' },
  { agent: 'brief-generator', produces: 'brief', next: 'draft-writer' },
  { agent: 'draft-writer', produces: 'draft', next: 'editor' },
  { agent: 'editor', produces: 'review', next: 'revision-agent' },
  { agent: 'revision-agent', produces: 'revised-draft', next: 'editor' },
  { agent: 'editor', produces: 'approved', next: 'distribution-agent' },
];

// ---------------------------------------------------------------------------
// Pipeline stages for UI display
// ---------------------------------------------------------------------------

export const PIPELINE_DISPLAY_STAGES = [
  { id: 'keyword-scout', label: 'Keywords', icon: 'search', description: 'Discover keyword opportunities' },
  { id: 'content-strategist', label: 'Strategy', icon: 'target', description: 'Plan content for keywords' },
  { id: 'brief-generator', label: 'Brief', icon: 'file-text', description: 'Generate detailed briefs' },
  { id: 'draft-writer', label: 'Draft', icon: 'pen-tool', description: 'Write first draft' },
  { id: 'editor', label: 'Review', icon: 'check-circle', description: 'Editorial review' },
  { id: 'distribution-agent', label: 'Publish', icon: 'send', description: 'Distribute content' },
] as const;

// ---------------------------------------------------------------------------
// Run the full pipeline for one content item
// ---------------------------------------------------------------------------

export async function runContentPipeline(
  keyword: string,
  _config: AutopilotEngineConfig,
  store: AgentWorkspaceView,
  _settings: Record<string, string>,
): Promise<PipelineResult> {
  const stages: PipelineResult['stages'] = [];
  let totalCredits = 0;

  // Stage 1: Keyword (already have it)
  stages.push({
    agent: 'keyword-scout',
    status: 'completed',
    output: { keyword },
    creditsUsed: 0,
  });

  // Notify content strategist
  postMessage({
    from: 'keyword-scout',
    to: 'content-strategist',
    type: 'task',
    subject: `Plan content for keyword: ${keyword}`,
    data: { keyword },
    priority: 'high',
  });

  // Stage 2: Content planning (handled by agent runs)
  postMessage({
    from: 'pipeline-runner',
    to: 'content-strategist',
    type: 'task',
    subject: `Create content plan for "${keyword}"`,
    data: { keyword, source: 'pipeline' },
    priority: 'high',
  });

  stages.push({
    agent: 'content-strategist',
    status: 'completed',
    output: { keyword, queued: true },
    creditsUsed: 0,
  });

  // Log the pipeline start
  store.logAgentRun('pipeline-runner', 'start_pipeline', { keyword }, 0);

  return {
    stages,
    totalCredits,
    success: true,
    finalOutput: {
      keyword,
      message: `Pipeline started for "${keyword}". Agents will process each stage as they run.`,
    },
  };
}

// ---------------------------------------------------------------------------
// Get current pipeline status for a keyword
// ---------------------------------------------------------------------------

export function getPipelineStatus(
  keyword: string,
  messages: AgentMessage[],
): Record<string, 'pending' | 'in-progress' | 'completed' | 'idle'> {
  const status: Record<string, 'pending' | 'in-progress' | 'completed' | 'idle'> = {};

  for (const stage of PIPELINE_DISPLAY_STAGES) {
    // Check if there are messages involving this agent for this keyword
    const relatedMsgs = messages.filter(
      (m) => (m.from === stage.id || m.to === stage.id) &&
             JSON.stringify(m.data).toLowerCase().includes(keyword.toLowerCase()),
    );

    if (relatedMsgs.length === 0) {
      status[stage.id] = 'idle';
    } else {
      const hasFeedback = relatedMsgs.some((m) => m.type === 'feedback');
      const hasTask = relatedMsgs.some((m) => m.type === 'task');
      if (hasFeedback) {
        status[stage.id] = 'completed';
      } else if (hasTask) {
        status[stage.id] = 'in-progress';
      } else {
        status[stage.id] = 'pending';
      }
    }
  }

  return status;
}
