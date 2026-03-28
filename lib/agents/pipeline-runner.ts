/**
 * Pipeline Runner -- the MASTER orchestrator.
 * Runs the complete content lifecycle autonomously:
 *
 * Discover -> Plan -> Brief -> Write -> Edit -> Revise (if needed) ->
 * Quality Gates -> Auto-Publish -> Distribute -> Monitor
 *
 * Human only intervenes when quality gates FAIL.
 */

import type { ContentItem } from '@/types/content';
import type { AutopilotEngineConfig, ContentPlan, DraftContent } from '@/lib/autopilot/engine';
import {
  discoverKeywords,
  planContent,
  generateDraft,
  optimizeDraft,
} from '@/lib/autopilot/engine';
import type { BrandVoiceProfile } from '@/lib/agents/voice';
import {
  runQualityGates,
  autoPublish,
  getPublishStats,
  type PublishLimits,
  type PublishLogEntry,
} from './autopublish';
import { pipelineStream } from '@/lib/pipeline/stream';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineConfig {
  autopilotConfig: AutopilotEngineConfig;
  publishLimits: PublishLimits;
  brandVoiceProfile: BrandVoiceProfile | null;
  settings: Record<string, string>;
}

export interface PipelinePhaseResult {
  keywords: { count: number; credits: number };
  planning: { plans: number; credits: number };
  briefing: { briefs: number; credits: number };
  writing: { drafts: number; credits: number };
  editing: { reviewed: number; passed: number; failed: number; credits: number };
  publishing: { published: number; held: number; platforms: Record<string, number> };
  distribution: { social: number; platforms: string[] };
}

export interface PipelineRunResult {
  started: number;
  completed: number;
  phases: PipelinePhaseResult;
  totalCredits: number;
  heldForReview: string[];
  publishLog: PublishLogEntry[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** Convert a DraftContent to a ContentItem for quality gate checking */
function draftToContentItem(draft: DraftContent, id: number): ContentItem {
  return {
    id,
    title: draft.title,
    slug: draft.slug,
    body: draft.body,
    content: draft.body,
    keyword: draft.keyword,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    wordCount: draft.wordCount,
    aiScore: draft.aiScore,
    seoScore: draft.seoScore,
    status: 'draft',
    created: Date.now(),
    updated: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Store interface (minimal to avoid circular dependency)
// ---------------------------------------------------------------------------

export interface PipelineStoreActions {
  content: ContentItem[];
  keywords: { keyword: string; term?: string }[];
  settings: Record<string, string>;
  addContent: (item: ContentItem) => void;
  updateContentItem: (id: number, updates: Partial<ContentItem>) => void;
  addPublishLog: (entry: PublishLogEntry) => void;
}

// ---------------------------------------------------------------------------
// Core: Full Autonomous Pipeline
// ---------------------------------------------------------------------------

/**
 * Run one full autonomous cycle through all phases.
 * Respects credit budgets and publish limits.
 */
export async function runFullPipeline(
  config: PipelineConfig,
  store: PipelineStoreActions,
): Promise<PipelineRunResult> {
  const started = Date.now();
  let totalCredits = 0;
  const errors: string[] = [];
  const heldForReview: string[] = [];
  const publishLog: PublishLogEntry[] = [];

  const phases: PipelinePhaseResult = {
    keywords: { count: 0, credits: 0 },
    planning: { plans: 0, credits: 0 },
    briefing: { briefs: 0, credits: 0 },
    writing: { drafts: 0, credits: 0 },
    editing: { reviewed: 0, passed: 0, failed: 0, credits: 0 },
    publishing: { published: 0, held: 0, platforms: {} },
    distribution: { social: 0, platforms: [] },
  };

  const ac = config.autopilotConfig;
  const existingKeywords = store.keywords.map((k) => k.keyword || k.term || '');
  const settingsMap = store.settings as unknown as Record<string, string>;

  // Budget guard
  if (totalCredits >= ac.dailyBudget) {
    errors.push('Daily credit budget exhausted before starting');
    return { started, completed: Date.now(), phases, totalCredits, heldForReview, publishLog, errors };
  }

  // --- Phase 1: Discover Keywords ---
  try {
    if (totalCredits < ac.dailyBudget) {
      pipelineStream.emit({ stage: 'discovering', message: 'Scanning niche for keyword opportunities...', creditCost: 1 });
      const keywords = await discoverKeywords(ac, existingKeywords, settingsMap);
      totalCredits += 1;
      phases.keywords = { count: keywords.length, credits: 1 };
      pipelineStream.emit({
        stage: 'discovering',
        message: `Found ${keywords.length} keyword${keywords.length !== 1 ? 's' : ''}`,
        data: { count: keywords.length },
      });
    }
  } catch (err) {
    pipelineStream.emit({ stage: 'error', message: `Discovery failed: ${err instanceof Error ? err.message : 'unknown error'}` });
    errors.push(`Discovery: ${err instanceof Error ? err.message : 'unknown error'}`);
  }

  // --- Phase 2: Plan Content ---
  let plans: ContentPlan[] = [];
  try {
    if (totalCredits < ac.dailyBudget) {
      pipelineStream.emit({ stage: 'planning', message: `Planning content from ${existingKeywords.length} keywords...`, creditCost: 1 });
      const maxPlans = Math.min(3, ac.dailyBudget - totalCredits);
      const dummyKeywords = existingKeywords.slice(0, 10).map((kw) => ({
        keyword: kw,
        estimatedVolume: 'medium' as const,
        estimatedDifficulty: 'medium' as const,
        intent: 'informational' as const,
        reason: 'existing keyword',
        score: 60,
      }));
      plans = await planContent(ac, dummyKeywords, store.content, maxPlans, settingsMap);
      totalCredits += 1;
      phases.planning = { plans: plans.length, credits: 1 };
      pipelineStream.emit({
        stage: 'planning',
        message: `Planned ${plans.length} article${plans.length !== 1 ? 's' : ''} for this cycle`,
        data: { plans: plans.map((p) => p.title) },
      });
    }
  } catch (err) {
    pipelineStream.emit({ stage: 'error', message: `Planning failed: ${err instanceof Error ? err.message : 'unknown error'}` });
    errors.push(`Planning: ${err instanceof Error ? err.message : 'unknown error'}`);
  }

  // --- Phase 3: Write Drafts ---
  const drafts: DraftContent[] = [];
  const totalToWrite = Math.min(plans.length, 2);
  for (let pi = 0; pi < totalToWrite; pi++) {
    const plan = plans[pi];
    if (totalCredits >= ac.dailyBudget) break;
    try {
      pipelineStream.emit({
        stage: 'writing',
        message: `Generating draft: "${plan.title}"...`,
        progress: { current: pi + 1, total: totalToWrite },
        creditCost: 1,
      });
      const draft = await generateDraft(plan, ac, store.content, settingsMap);
      drafts.push(draft);
      totalCredits += 1;
      phases.writing.drafts += 1;
      phases.writing.credits += 1;
    } catch (err) {
      pipelineStream.emit({ stage: 'error', message: `Writing "${plan.title}" failed: ${err instanceof Error ? err.message : 'unknown'}` });
      errors.push(`Writing "${plan.title}": ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  // --- Phase 4: Edit / Optimize ---
  pipelineStream.emit({ stage: 'editing', message: `Editorial review: checking SEO, readability, facts for ${drafts.length} draft${drafts.length !== 1 ? 's' : ''}...` });
  const optimizedDrafts: DraftContent[] = [];
  for (const draft of drafts) {
    if (totalCredits >= ac.dailyBudget) {
      optimizedDrafts.push(draft); // skip optimization but keep draft
      continue;
    }
    try {
      const optimized = await optimizeDraft(draft, ac, store.content, settingsMap);
      optimizedDrafts.push(optimized);
      totalCredits += 1;
      phases.editing.reviewed += 1;
      phases.editing.credits += 1;

      if (optimized.seoScore >= config.publishLimits.minSEOScore) {
        phases.editing.passed += 1;
      } else {
        phases.editing.failed += 1;
      }
    } catch (err) {
      optimizedDrafts.push(draft); // keep original on failure
      phases.editing.failed += 1;
      errors.push(`Editing "${draft.title}": ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  // --- Phase 5: Quality Gates + Auto-Publish ---
  pipelineStream.emit({ stage: 'quality-gates', message: `Running quality gates on ${optimizedDrafts.length} draft${optimizedDrafts.length !== 1 ? 's' : ''}...` });
  const stats = getPublishStats(store.content);

  for (const draft of optimizedDrafts) {
    const nextId = Date.now() + Math.floor(Math.random() * 10000);
    const contentItem = draftToContentItem(draft, nextId);

    const decision = runQualityGates(
      contentItem,
      config.publishLimits,
      stats.today + phases.publishing.published,
      stats.thisWeek + phases.publishing.published,
      store.content,
    );

    if (decision.canAutoPublish) {
      // Add to store as published
      const publishedItem: ContentItem = {
        ...contentItem,
        status: 'published',
        publishDate: Date.now(),
      };
      store.addContent(publishedItem);

      // Publish to all platforms
      pipelineStream.emit({
        stage: 'publishing',
        message: `Publishing "${publishedItem.title}" to ${decision.platforms.join(', ')}`,
        data: { title: publishedItem.title, platforms: decision.platforms },
      });
      const results = await autoPublish(publishedItem, decision.platforms, ac, settingsMap);
      phases.publishing.published += 1;

      for (const r of results) {
        const p = r.platform;
        phases.publishing.platforms[p] = (phases.publishing.platforms[p] || 0) + (r.success ? 1 : 0);
      }

      // Social distribution
      const socialPlatforms = decision.platforms.filter((p) => p === 'twitter' || p === 'linkedin');
      if (socialPlatforms.length > 0) {
        pipelineStream.emit({
          stage: 'distributing',
          message: `Distributing "${publishedItem.title}" to ${socialPlatforms.join(', ')}`,
          data: { platforms: socialPlatforms },
        });
        phases.distribution.social += socialPlatforms.length;
        phases.distribution.platforms.push(...socialPlatforms);
      }

      const logEntry: PublishLogEntry = {
        contentId: publishedItem.id,
        title: publishedItem.title,
        timestamp: Date.now(),
        platforms: decision.platforms,
        results,
        gateResults: decision.gateResults.map((g) => ({
          gate: g.gate,
          passed: g.result.passed,
          severity: g.severity,
        })),
        held: false,
      };
      publishLog.push(logEntry);
      store.addPublishLog(logEntry);
    } else {
      // Hold for review
      const reviewItem: ContentItem = {
        ...contentItem,
        status: 'review',
      };
      store.addContent(reviewItem);
      phases.publishing.held += 1;
      heldForReview.push(draft.title);

      const logEntry: PublishLogEntry = {
        contentId: reviewItem.id,
        title: reviewItem.title,
        timestamp: Date.now(),
        platforms: [],
        results: [],
        gateResults: decision.gateResults.map((g) => ({
          gate: g.gate,
          passed: g.result.passed,
          severity: g.severity,
        })),
        held: true,
        holdReason: decision.holdReason,
      };
      publishLog.push(logEntry);
      store.addPublishLog(logEntry);
    }
  }

  pipelineStream.emit({
    stage: 'complete',
    message: `Pipeline complete: ${phases.writing.drafts} article${phases.writing.drafts !== 1 ? 's' : ''}, ${phases.keywords.count} keywords, ${totalCredits} credits used`,
    data: {
      drafts: phases.writing.drafts,
      published: phases.publishing.published,
      held: phases.publishing.held,
      keywords: phases.keywords.count,
      totalCredits,
    },
  });

  return {
    started,
    completed: Date.now(),
    phases,
    totalCredits,
    heldForReview,
    publishLog,
    errors,
  };
}

/**
 * Run just the publish cycle for content already in draft/review status.
 * No AI credits used -- purely quality gates + publishing.
 */
export async function runPublishCycle(
  config: PipelineConfig,
  store: PipelineStoreActions,
): Promise<{ published: number; held: number; log: PublishLogEntry[] }> {
  const stats = getPublishStats(store.content);
  let published = 0;
  let held = 0;
  const log: PublishLogEntry[] = [];
  const settingsMap = store.settings as unknown as Record<string, string>;

  // Find content ready for publishing (in review status)
  const reviewContent = store.content.filter(
    (c) => c.status === 'review' || (c.status === 'draft' && c.seoScore >= config.publishLimits.minSEOScore),
  );

  for (const content of reviewContent) {
    const decision = runQualityGates(
      content,
      config.publishLimits,
      stats.today + published,
      stats.thisWeek + published,
      store.content,
    );

    if (decision.canAutoPublish) {
      store.updateContentItem(content.id, {
        status: 'published',
        publishDate: Date.now(),
      });

      const results = await autoPublish(content, decision.platforms, config.autopilotConfig, settingsMap);
      published += 1;

      const entry: PublishLogEntry = {
        contentId: content.id,
        title: content.title,
        timestamp: Date.now(),
        platforms: decision.platforms,
        results,
        gateResults: decision.gateResults.map((g) => ({
          gate: g.gate,
          passed: g.result.passed,
          severity: g.severity,
        })),
        held: false,
      };
      log.push(entry);
      store.addPublishLog(entry);
    } else {
      held += 1;

      const entry: PublishLogEntry = {
        contentId: content.id,
        title: content.title,
        timestamp: Date.now(),
        platforms: [],
        results: [],
        gateResults: decision.gateResults.map((g) => ({
          gate: g.gate,
          passed: g.result.passed,
          severity: g.severity,
        })),
        held: true,
        holdReason: decision.holdReason,
      };
      log.push(entry);
      store.addPublishLog(entry);
    }

    // Stop if daily limit hit
    if (stats.today + published >= config.publishLimits.maxPerDay) break;
  }

  return { published, held, log };
}

/**
 * Calculate when the next pipeline run should occur.
 */
export function getNextRunTime(config: PipelineConfig): number {
  const now = new Date();
  let currentHour: number;
  try {
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: config.publishLimits.publishTimezone,
    });
    currentHour = parseInt(timeStr, 10);
  } catch {
    currentHour = now.getHours();
  }

  // Next run at the start of the publish window, or in 6 hours if inside the window
  if (currentHour < config.publishLimits.publishHoursStart) {
    const hoursUntilStart = config.publishLimits.publishHoursStart - currentHour;
    return Date.now() + hoursUntilStart * 3600000;
  }

  if (currentHour >= config.publishLimits.publishHoursEnd) {
    const hoursUntilTomorrow = 24 - currentHour + config.publishLimits.publishHoursStart;
    return Date.now() + hoursUntilTomorrow * 3600000;
  }

  // Inside window -- run in 6 hours or at end of window, whichever is sooner
  const hoursLeft = config.publishLimits.publishHoursEnd - currentHour;
  return Date.now() + Math.min(6, hoursLeft) * 3600000;
}
