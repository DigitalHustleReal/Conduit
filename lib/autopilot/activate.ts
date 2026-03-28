/**
 * First-run workspace activation.
 *
 * Called after onboarding to bootstrap the workspace with real data.
 * This is what makes Conduit feel "alive" from minute one.
 *
 * Uses 3 AI credits total:
 *   1. Discover 10 keywords for the niche
 *   2. Plan 3 articles from top keywords
 *   3. Generate 1 draft from the top plan
 */

import { discoverKeywords, planContent, generateDraft } from './engine';
import type {
  AutopilotEngineConfig,
  KeywordSuggestion,
  ContentPlan,
  DraftContent,
} from './engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivationConfig {
  niche: string;
  domain: string;
  competitors: string[];
  language: string;
  targetAudience: string;
  contentGoal: 'traffic' | 'authority' | 'conversion';
}

export interface ActivationResult {
  keywords: KeywordSuggestion[];
  plans: ContentPlan[];
  draft: DraftContent | null;
  creditsUsed: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Main activation function
// ---------------------------------------------------------------------------

export async function activateWorkspace(
  config: ActivationConfig,
  settings: Record<string, string> = {},
): Promise<ActivationResult> {
  const result: ActivationResult = {
    keywords: [],
    plans: [],
    draft: null,
    creditsUsed: 0,
    errors: [],
  };

  // Build engine config from activation config
  const engineConfig: AutopilotEngineConfig = {
    niche: config.niche,
    domain: config.domain,
    language: config.language,
    targetAudience: config.targetAudience || 'general audience',
    contentGoal: config.contentGoal,
    dailyBudget: 10,
    autoPublish: false,
    competitors: config.competitors,
  };

  // Step 1: Discover keywords (1 AI credit)
  try {
    const keywords = await discoverKeywords(engineConfig, [], settings);
    result.keywords = keywords;
    result.creditsUsed += 1;
  } catch (err) {
    result.errors.push(
      `Keyword discovery: ${err instanceof Error ? err.message : 'failed'}`,
    );
  }

  // Step 2: Plan content from discovered keywords (1 AI credit)
  if (result.keywords.length > 0) {
    try {
      const plans = await planContent(engineConfig, result.keywords, [], 3, settings);
      result.plans = plans;
      result.creditsUsed += 1;
    } catch (err) {
      result.errors.push(
        `Content planning: ${err instanceof Error ? err.message : 'failed'}`,
      );
    }
  }

  // Step 3: Generate a draft from the top plan (1 AI credit)
  if (result.plans.length > 0) {
    try {
      const draft = await generateDraft(result.plans[0], engineConfig, [], settings);
      result.draft = draft;
      result.creditsUsed += 1;
    } catch (err) {
      result.errors.push(
        `Draft generation: ${err instanceof Error ? err.message : 'failed'}`,
      );
    }
  }

  return result;
}
