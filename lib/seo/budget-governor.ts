/**
 * Budget Governor -- tracks REAL cost per AI call, not just credit count.
 *
 * Anthropic Claude Sonnet pricing:
 * - Input: $3 per 1M tokens
 * - Output: $15 per 1M tokens
 * - Average article generation: ~$0.02-0.05
 * - Average keyword discovery: ~$0.01
 *
 * Tracks: tokens used, cost in USD, daily/weekly/monthly totals.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CostEntry {
  timestamp: number;
  type: string;                // 'keyword_discovery' | 'content_generation' | 'seo_optimization' | 'chat' | 'fact_check'
  inputTokens: number;
  outputTokens: number;
  cost: number;                // USD
  provider: string;
}

export interface BudgetStatus {
  canGenerate: boolean;
  tokensUsedToday: number;
  costToday: number;           // USD
  costThisWeek: number;
  costThisMonth: number;
  dailyLimit: number;          // USD, default $1.00
  remaining: number;           // USD
  isPaused: boolean;
  reason?: string;
}

export interface CostSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  byType: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Provider pricing (USD per 1M tokens)
// ---------------------------------------------------------------------------

const PRICING: Record<string, { input: number; output: number }> = {
  anthropic: { input: 3.0, output: 15.0 },      // Claude Sonnet
  openai: { input: 2.5, output: 10.0 },          // GPT-4o
  gemini: { input: 1.25, output: 5.0 },          // Gemini 1.5 Pro
  mistral: { input: 2.0, output: 6.0 },          // Mistral Large
  groq: { input: 0.27, output: 0.27 },           // Llama via Groq
};

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function startOfDay(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday start
  return d.getTime();
}

function startOfMonth(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Estimate the cost of an AI call before making it.
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  provider: string = 'anthropic',
): number {
  const pricing = PRICING[provider] || PRICING.anthropic;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return parseFloat((inputCost + outputCost).toFixed(6));
}

/**
 * Create a cost entry after an AI call.
 */
export function createCostEntry(
  type: string,
  inputTokens: number,
  outputTokens: number,
  provider: string = 'anthropic',
): CostEntry {
  return {
    timestamp: Date.now(),
    type,
    inputTokens,
    outputTokens,
    cost: estimateCost(inputTokens, outputTokens, provider),
    provider,
  };
}

/**
 * Estimate token count from text. Rough: ~4 chars per token for English.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Check if generation is allowed within budget.
 */
export function checkBudget(
  entries: CostEntry[],
  dailyLimit: number = 1.0,
): BudgetStatus {
  const dayStart = startOfDay();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  let costToday = 0;
  let costThisWeek = 0;
  let costThisMonth = 0;
  let tokensUsedToday = 0;

  for (const entry of entries) {
    if (entry.timestamp >= monthStart) {
      costThisMonth += entry.cost;
    }
    if (entry.timestamp >= weekStart) {
      costThisWeek += entry.cost;
    }
    if (entry.timestamp >= dayStart) {
      costToday += entry.cost;
      tokensUsedToday += entry.inputTokens + entry.outputTokens;
    }
  }

  costToday = parseFloat(costToday.toFixed(4));
  costThisWeek = parseFloat(costThisWeek.toFixed(4));
  costThisMonth = parseFloat(costThisMonth.toFixed(4));

  const remaining = parseFloat(Math.max(0, dailyLimit - costToday).toFixed(4));
  const canGenerate = costToday < dailyLimit;

  let reason: string | undefined;
  if (!canGenerate) {
    reason = `Daily budget of $${dailyLimit.toFixed(2)} exhausted. Spent $${costToday.toFixed(4)} today.`;
  }

  return {
    canGenerate,
    tokensUsedToday,
    costToday,
    costThisWeek,
    costThisMonth,
    dailyLimit,
    remaining,
    isPaused: !canGenerate,
    reason,
  };
}

/**
 * Get cost summary for dashboard display.
 */
export function getCostSummary(entries: CostEntry[]): CostSummary {
  const dayStart = startOfDay();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  let today = 0;
  let week = 0;
  let month = 0;
  let total = 0;
  const byType: Record<string, number> = {};

  for (const entry of entries) {
    total += entry.cost;

    if (!byType[entry.type]) byType[entry.type] = 0;
    byType[entry.type] += entry.cost;

    if (entry.timestamp >= monthStart) month += entry.cost;
    if (entry.timestamp >= weekStart) week += entry.cost;
    if (entry.timestamp >= dayStart) today += entry.cost;
  }

  return {
    today: parseFloat(today.toFixed(4)),
    week: parseFloat(week.toFixed(4)),
    month: parseFloat(month.toFixed(4)),
    total: parseFloat(total.toFixed(4)),
    byType: Object.fromEntries(
      Object.entries(byType).map(([k, v]) => [k, parseFloat(v.toFixed(4))]),
    ),
  };
}
