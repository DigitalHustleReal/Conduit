/**
 * Autopilot Engine -- runs the full content lifecycle autonomously.
 *
 * When activated it:
 * 1. Discovers keywords from the user's niche
 * 2. Plans content based on keyword gaps
 * 3. Generates drafts with optimised titles/meta
 * 4. Scores and auto-fixes SEO issues
 * 5. Queues for publishing at optimal times
 * 6. Monitors performance and suggests refreshes
 */

import { callAI } from '@/lib/ai/call-ai';
import { heuristicSEOScore } from '@/lib/scoring/seo-score';
import type { ContentItem } from '@/types/content';
import {
  fillPrompt,
  KEYWORD_DISCOVERY_PROMPT,
  CONTENT_PLAN_PROMPT,
  DRAFT_GENERATION_PROMPT,
  SEO_OPTIMIZATION_PROMPT,
  PERFORMANCE_ANALYSIS_PROMPT,
} from './prompts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutopilotEngineConfig {
  niche: string;
  domain: string; // user's website domain
  language: string;
  targetAudience: string;
  contentGoal: 'traffic' | 'authority' | 'conversion';
  dailyBudget: number; // max AI credits per day
  autoPublish: boolean; // auto-publish or queue for review
  competitors: string[]; // competitor domains to analyse
}

export interface AutopilotEngineState {
  isRunning: boolean;
  lastRun: number;
  phase: 'idle' | 'discovering' | 'planning' | 'generating' | 'optimizing' | 'monitoring';
  discoveredKeywords: KeywordSuggestion[];
  plannedContent: ContentPlan[];
  generatedDrafts: DraftContent[];
  optimizationQueue: OptimizationTask[];
  performanceAlerts: PerformanceAlert[];
  creditsUsedToday: number;
  log: AutopilotEngineLogEntry[];
}

export interface KeywordSuggestion {
  keyword: string;
  estimatedVolume: 'high' | 'medium' | 'low';
  estimatedDifficulty: 'high' | 'medium' | 'low';
  intent: 'informational' | 'transactional' | 'navigational' | 'commercial';
  reason: string;
  score: number; // 0-100 opportunity score
}

export interface ContentPlan {
  title: string;
  keyword: string;
  outline: string[];
  targetWordCount: number;
  contentType: 'article' | 'guide' | 'comparison' | 'listicle';
  priority: 'high' | 'medium' | 'low';
  scheduledDate: string;
}

export interface DraftContent {
  title: string;
  slug: string;
  body: string;
  keyword: string;
  metaTitle: string;
  metaDescription: string;
  seoScore: number;
  aiScore: number;
  wordCount: number;
  status: 'draft' | 'review' | 'approved';
}

export interface OptimizationTask {
  draftIndex: number;
  issues: string[];
  status: 'pending' | 'in_progress' | 'done';
}

export interface PerformanceAlert {
  contentId: number;
  title: string;
  issue: 'stale' | 'low_seo' | 'low_engagement' | 'thin_content' | 'missing_meta';
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface AutopilotEngineLogEntry {
  ts: number;
  phase: string;
  message: string;
  creditsUsed: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function createDefaultEngineState(): AutopilotEngineState {
  return {
    isRunning: false,
    lastRun: 0,
    phase: 'idle',
    discoveredKeywords: [],
    plannedContent: [],
    generatedDrafts: [],
    optimizationQueue: [],
    performanceAlerts: [],
    creditsUsedToday: 0,
    log: [],
  };
}

export function createAutopilotConfig(niche: string, language: string): AutopilotEngineConfig {
  return {
    niche,
    language,
    targetAudience: 'general audience',
    contentGoal: 'traffic',
    dailyBudget: 10,
    autoPublish: false,
    competitors: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(
  state: AutopilotEngineState,
  phase: string,
  message: string,
  creditsUsed: number = 0,
): AutopilotEngineState {
  return {
    ...state,
    log: [
      ...state.log,
      { ts: Date.now(), phase, message, creditsUsed },
    ].slice(-200), // keep last 200 entries
  };
}

function budgetOk(state: AutopilotEngineState, config: AutopilotEngineConfig): boolean {
  return state.creditsUsedToday < config.dailyBudget;
}

function useCredit(state: AutopilotEngineState): AutopilotEngineState {
  return { ...state, creditsUsedToday: state.creditsUsedToday + 1 };
}

/** Safely parse a JSON string, returning null on failure. */
function safeParseJSON<T>(text: string): T | null {
  try {
    // Strip markdown code fences if the model wrapped the response
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
    }
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Discover keyword opportunities for the given niche.
 * Uses one AI credit per call and returns up to 10 keywords.
 */
export async function discoverKeywords(
  config: AutopilotEngineConfig,
  existingKeywords: string[],
  settings: Record<string, string> = {},
): Promise<KeywordSuggestion[]> {
  const prompt = fillPrompt(KEYWORD_DISCOVERY_PROMPT, {
    niche: config.niche,
    audience: config.targetAudience,
    goal: config.contentGoal,
    language: config.language,
    domain: config.domain || 'not set',
    competitors: config.competitors.length > 0 ? config.competitors.join(', ') : 'none specified',
    existingKeywords: existingKeywords.length > 0 ? existingKeywords.join(', ') : 'none yet',
  });

  const raw = await callAI(prompt, {
    system: 'You are an SEO keyword research expert. Return ONLY valid JSON arrays.',
    maxTokens: 2000,
  }, settings);

  const parsed = safeParseJSON<KeywordSuggestion[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return [];

  // Filter out any that match existing keywords (case-insensitive)
  const existingLower = new Set(existingKeywords.map((k) => k.toLowerCase()));
  return parsed
    .filter((k) => k.keyword && !existingLower.has(k.keyword.toLowerCase()))
    .slice(0, 10);
}

/**
 * Plan content for discovered keywords, avoiding duplicates with existing content.
 */
export async function planContent(
  config: AutopilotEngineConfig,
  keywords: KeywordSuggestion[],
  existingContent: ContentItem[],
  count: number = 5,
  settings: Record<string, string> = {},
): Promise<ContentPlan[]> {
  if (keywords.length === 0) return [];

  const keywordSummary = keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((k) => `${k.keyword} (score: ${k.score}, intent: ${k.intent})`)
    .join('\n');

  const existingTitles = existingContent
    .map((c) => c.title)
    .slice(0, 50)
    .join('\n');

  const prompt = fillPrompt(CONTENT_PLAN_PROMPT, {
    niche: config.niche,
    audience: config.targetAudience,
    goal: config.contentGoal,
    language: config.language,
    domain: config.domain || 'not set',
    competitors: config.competitors.length > 0 ? config.competitors.join(', ') : 'none specified',
    today: new Date().toISOString().split('T')[0],
    keywords: keywordSummary,
    existingTitles: existingTitles || 'none yet',
    count: String(Math.min(count, 7)),
  });

  const raw = await callAI(prompt, {
    system: 'You are a content strategist. Return ONLY valid JSON arrays.',
    maxTokens: 2000,
  }, settings);

  const parsed = safeParseJSON<ContentPlan[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return [];

  return parsed.slice(0, count);
}

/**
 * Generate a full article draft from a content plan.
 */
export async function generateDraft(
  plan: ContentPlan,
  config: AutopilotEngineConfig,
  allContent: ContentItem[] = [],
  settings: Record<string, string> = {},
): Promise<DraftContent> {
  const prompt = fillPrompt(DRAFT_GENERATION_PROMPT, {
    niche: config.niche,
    audience: config.targetAudience,
    goal: config.contentGoal,
    language: config.language,
    title: plan.title,
    keyword: plan.keyword,
    contentType: plan.contentType,
    targetWordCount: String(plan.targetWordCount),
    outline: plan.outline.join('\n- '),
  });

  const raw = await callAI(prompt, {
    system: 'You are an expert content writer. Return ONLY valid JSON.',
    maxTokens: 4000,
  }, settings);

  const parsed = safeParseJSON<{ body: string; metaTitle: string; metaDescription: string }>(raw);

  const body = parsed?.body || '';
  const wordCount = countWords(body);
  const slug = slugify(plan.title);

  // Calculate an initial SEO score using the heuristic scorer
  const tempItem: ContentItem = {
    id: 0,
    title: plan.title,
    slug,
    body,
    content: body,
    keyword: plan.keyword,
    metaTitle: parsed?.metaTitle || plan.title,
    metaDescription: parsed?.metaDescription || '',
    wordCount,
    aiScore: 0,
    seoScore: 0,
    status: 'draft',
    created: Date.now(),
    updated: Date.now(),
  };
  const seoScore = heuristicSEOScore(tempItem, allContent);

  return {
    title: plan.title,
    slug,
    body,
    keyword: plan.keyword,
    metaTitle: parsed?.metaTitle || plan.title.slice(0, 60),
    metaDescription: parsed?.metaDescription || '',
    seoScore,
    aiScore: body.length > 200 ? 70 : 40, // basic heuristic
    wordCount,
    status: config.autoPublish ? 'approved' : 'draft',
  };
}

/**
 * Re-analyse and optimise a draft for SEO issues.
 */
export async function optimizeDraft(
  draft: DraftContent,
  config: AutopilotEngineConfig,
  allContent: ContentItem[] = [],
  settings: Record<string, string> = {},
): Promise<DraftContent> {
  const prompt = fillPrompt(SEO_OPTIMIZATION_PROMPT, {
    niche: config.niche,
    keyword: draft.keyword,
    language: config.language,
    title: draft.title,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    wordCount: String(draft.wordCount),
    body: draft.body.slice(0, 6000), // cap body length sent to AI
  });

  const raw = await callAI(prompt, {
    system: 'You are an SEO specialist. Return ONLY valid JSON.',
    maxTokens: 4000,
  }, settings);

  const parsed = safeParseJSON<{
    body: string;
    metaTitle: string;
    metaDescription: string;
    seoScore: number;
    fixes: string[];
    internalLinkSuggestions: string[];
  }>(raw);

  if (!parsed || !parsed.body) {
    // AI call failed to produce usable output; return original
    return draft;
  }

  const newBody = parsed.body;
  const wordCount = countWords(newBody);

  // Re-score with heuristic scorer for consistency
  const tempItem: ContentItem = {
    id: 0,
    title: draft.title,
    slug: draft.slug,
    body: newBody,
    content: newBody,
    keyword: draft.keyword,
    metaTitle: parsed.metaTitle || draft.metaTitle,
    metaDescription: parsed.metaDescription || draft.metaDescription,
    wordCount,
    aiScore: 0,
    seoScore: 0,
    status: 'draft',
    created: Date.now(),
    updated: Date.now(),
  };
  const seoScore = heuristicSEOScore(tempItem, allContent);

  return {
    ...draft,
    body: newBody,
    metaTitle: parsed.metaTitle || draft.metaTitle,
    metaDescription: parsed.metaDescription || draft.metaDescription,
    seoScore,
    aiScore: Math.min(95, draft.aiScore + 10),
    wordCount,
    status: config.autoPublish ? 'approved' : 'review',
  };
}

/**
 * Analyse published content for performance issues.
 */
export async function analyzePerformance(
  content: ContentItem[],
  niche: string = 'general',
  settings: Record<string, string> = {},
): Promise<PerformanceAlert[]> {
  const published = content.filter((c) => c.status === 'published');
  if (published.length === 0) return [];

  const summaryItems = published.slice(0, 30).map((c) => ({
    id: c.id,
    title: c.title,
    wordCount: c.wordCount,
    seoScore: c.seoScore,
    metaTitle: c.metaTitle || c.seoTitle || '',
    metaDescription: c.metaDescription || c.metaDesc || '',
    updatedDaysAgo: Math.round((Date.now() - (c.updated || c.created)) / 86400000),
  }));

  const prompt = fillPrompt(PERFORMANCE_ANALYSIS_PROMPT, {
    niche,
    contentSummary: JSON.stringify(summaryItems, null, 2),
  });

  const raw = await callAI(prompt, {
    system: 'You are a content performance analyst. Return ONLY valid JSON arrays.',
    maxTokens: 2000,
  }, settings);

  const parsed = safeParseJSON<PerformanceAlert[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return [];

  return parsed;
}

// ---------------------------------------------------------------------------
// Full Autopilot Cycle
// ---------------------------------------------------------------------------

/**
 * Run a single autopilot cycle through all phases.
 *
 * Respects the daily credit budget: if the budget is exhausted at any point
 * the cycle stops and returns the current state.
 */
export async function runAutopilotCycle(
  config: AutopilotEngineConfig,
  state: AutopilotEngineState,
  existingKeywords: string[],
  existingContent: ContentItem[],
  settings: Record<string, string> = {},
): Promise<AutopilotEngineState> {
  let s: AutopilotEngineState = {
    ...state,
    isRunning: true,
    lastRun: Date.now(),
  };

  // --- Phase 1: Discover Keywords ---
  if (budgetOk(s, config)) {
    s = { ...s, phase: 'discovering' };
    s = log(s, 'discovering', 'Starting keyword discovery...');
    try {
      const keywords = await discoverKeywords(config, existingKeywords, settings);
      s = useCredit(s);
      s = {
        ...s,
        discoveredKeywords: [...s.discoveredKeywords, ...keywords],
      };
      s = log(s, 'discovering', `Discovered ${keywords.length} new keywords`, 1);
    } catch (err) {
      s = log(s, 'discovering', `Keyword discovery failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  } else {
    s = log(s, 'discovering', 'Skipped: daily budget exhausted');
  }

  // --- Phase 2: Plan Content ---
  if (budgetOk(s, config) && s.discoveredKeywords.length > 0) {
    s = { ...s, phase: 'planning' };
    s = log(s, 'planning', 'Planning content for discovered keywords...');
    try {
      const plans = await planContent(
        config,
        s.discoveredKeywords,
        existingContent,
        Math.min(3, config.dailyBudget - s.creditsUsedToday), // plan at most as many as budget allows for generation
        settings,
      );
      s = useCredit(s);
      s = {
        ...s,
        plannedContent: [...s.plannedContent, ...plans],
      };
      s = log(s, 'planning', `Created ${plans.length} content plans`, 1);
    } catch (err) {
      s = log(s, 'planning', `Content planning failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  } else if (!budgetOk(s, config)) {
    s = log(s, 'planning', 'Skipped: daily budget exhausted');
  }

  // --- Phase 3: Generate Drafts (one per cycle to conserve budget) ---
  const pendingPlans = s.plannedContent.filter(
    (p) => !s.generatedDrafts.some((d) => d.keyword === p.keyword),
  );

  if (budgetOk(s, config) && pendingPlans.length > 0) {
    s = { ...s, phase: 'generating' };
    const plan = pendingPlans[0];
    s = log(s, 'generating', `Generating draft: "${plan.title}"...`);
    try {
      const draft = await generateDraft(plan, config, existingContent, settings);
      s = useCredit(s);
      s = {
        ...s,
        generatedDrafts: [...s.generatedDrafts, draft],
      };
      s = log(s, 'generating', `Generated draft "${draft.title}" (${draft.wordCount} words, SEO: ${draft.seoScore})`, 1);
    } catch (err) {
      s = log(s, 'generating', `Draft generation failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  } else if (!budgetOk(s, config)) {
    s = log(s, 'generating', 'Skipped: daily budget exhausted');
  }

  // --- Phase 4: Optimise Drafts ---
  const unoptimizedDrafts = s.generatedDrafts.filter((d) => d.status === 'draft');
  if (budgetOk(s, config) && unoptimizedDrafts.length > 0) {
    s = { ...s, phase: 'optimizing' };
    const draft = unoptimizedDrafts[0];
    s = log(s, 'optimizing', `Optimizing draft: "${draft.title}"...`);
    try {
      const optimized = await optimizeDraft(draft, config, existingContent, settings);
      s = useCredit(s);
      s = {
        ...s,
        generatedDrafts: s.generatedDrafts.map((d) =>
          d.slug === draft.slug ? optimized : d,
        ),
      };
      s = log(s, 'optimizing', `Optimised "${optimized.title}" (SEO: ${optimized.seoScore})`, 1);
    } catch (err) {
      s = log(s, 'optimizing', `Optimisation failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  } else if (!budgetOk(s, config)) {
    s = log(s, 'optimizing', 'Skipped: daily budget exhausted');
  }

  // --- Phase 5: Monitor Performance ---
  if (budgetOk(s, config) && existingContent.filter((c) => c.status === 'published').length > 0) {
    s = { ...s, phase: 'monitoring' };
    s = log(s, 'monitoring', 'Analysing content performance...');
    try {
      const alerts = await analyzePerformance(existingContent, config.niche, settings);
      s = useCredit(s);
      s = {
        ...s,
        performanceAlerts: alerts,
      };
      s = log(s, 'monitoring', `Found ${alerts.length} performance alerts`, 1);
    } catch (err) {
      s = log(s, 'monitoring', `Performance analysis failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  } else if (!budgetOk(s, config)) {
    s = log(s, 'monitoring', 'Skipped: daily budget exhausted');
  }

  // --- Done ---
  s = {
    ...s,
    isRunning: false,
    phase: 'idle',
  };
  s = log(s, 'idle', `Cycle complete. Credits used today: ${s.creditsUsedToday}/${config.dailyBudget}`);

  return s;
}
