export interface MicroAgent {
  id: string;
  cat: string;
  name: string;
  ico: string;
  desc: string;
  credits: number;
  fn: (item: Record<string, unknown>) => AgentConfig;
}

export interface AgentConfig {
  prompt?: string;
  system?: string;
  parse?: 'json' | 'text';
  maxTokens?: number;
  noAI?: boolean;
  result?: unknown;
  autoApply?: boolean;
  applyFn?: (result: unknown, item: Record<string, unknown>) => void;
}

export interface AgentChain {
  id: string;
  name: string;
  ico: string;
  desc: string;
  credits: string;
  steps: AgentChainStep[];
}

export interface AgentChainStep {
  agent: string;
  label: string;
  transform?: string;
}

export interface AgentRegistryEntry {
  enabled: boolean;
  running: boolean;
  lastRun: number | null;
  interval: number | null;
}

export interface AgentHistoryEntry {
  agentId: string;
  action: string;
  ts: number;
  result: unknown;
  creditsUsed: number;
}

export interface AgentFeedbackEntry {
  agent_id: string;
  action: 'accepted' | 'rejected' | 'modified' | 'ignored';
  content_id: string | null;
  suggestion: string;
  ts: number;
}

export interface AgentEffectiveness {
  effectiveness: number;
  acceptRate: number;
  totalRuns: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AgentState {
  registry: Record<string, AgentRegistryEntry>;
  history: AgentHistoryEntry[];
  queue: unknown[];
  reports: Record<string, unknown>;
  onboarded: boolean;
}
