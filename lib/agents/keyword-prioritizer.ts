/**
 * Keyword Prioritizer -- decides WHICH keyword to target next.
 *
 * All heuristic, 0 AI credits.
 *
 * Factors: site strength, topical authority, keyword difficulty,
 * content gaps, competitor analysis, commercial value, trending status.
 */

import type { KeywordSuggestion } from '@/lib/autopilot/engine';
import type { ContentItem } from '@/types/content';
import type { SiteStrength } from './serp-intel';
import type { TopicCluster } from './topical-authority';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeywordPriority {
  keyword: string;
  score: number;
  factors: {
    difficultyMatch: number;
    topicalRelevance: number;
    commercialValue: number;
    trendingBonus: number;
    competitorGap: number;
    contentGap: number;
  };
  approach: 'write-now' | 'cluster-first' | 'long-tail-approach' | 'wait-for-authority';
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function hasOverlap(a: string, b: string): boolean {
  const wordsA = extractWords(a);
  const wordsB = extractWords(b);
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap >= 1;
}

// ---------------------------------------------------------------------------
// prioritizeKeywords  (0 credits -- pure heuristic)
// ---------------------------------------------------------------------------

export function prioritizeKeywords(
  keywords: KeywordSuggestion[],
  siteStrength: SiteStrength,
  clusters: TopicCluster[],
  existingContent: ContentItem[],
): KeywordPriority[] {
  const da = siteStrength.estimatedDA;
  const existingKeywordsLower = new Set(
    existingContent
      .map((c) => (c.keyword || '').toLowerCase())
      .filter(Boolean),
  );

  return keywords.map((kw) => {
    // ------------------------------------------------------------------
    // difficultyMatch (0-25): target keywords YOU can actually rank for
    // ------------------------------------------------------------------
    let difficultyMatch = 0;
    const diff = kw.estimatedDifficulty;

    if (diff === 'low') {
      // Low difficulty always good
      difficultyMatch = da >= 30 ? 25 : da >= 15 ? 22 : 20;
    } else if (diff === 'medium') {
      // Medium -- good for mid-DA sites
      if (da >= 40) difficultyMatch = 22;
      else if (da >= 25) difficultyMatch = 18;
      else if (da >= 15) difficultyMatch = 12;
      else difficultyMatch = 8;
    } else {
      // High difficulty -- only worthwhile for strong sites
      if (da >= 60) difficultyMatch = 18;
      else if (da >= 40) difficultyMatch = 12;
      else if (da >= 25) difficultyMatch = 8;
      else difficultyMatch = 5;
    }

    // ------------------------------------------------------------------
    // topicalRelevance (0-20): fits an existing cluster?
    // ------------------------------------------------------------------
    let topicalRelevance = 5; // default: random topic

    const matchedCluster = clusters.find((c) => {
      const allClusterKeywords = [
        c.pillarKeyword,
        ...c.supportingKeywords,
        ...(c.pillarContent ? [c.pillarContent.title] : []),
        ...c.supportingContent.map((s) => s.keyword || s.title),
      ];
      return allClusterKeywords.some((ck) => hasOverlap(ck, kw.keyword));
    });

    if (matchedCluster) {
      // Fits an existing cluster
      topicalRelevance = matchedCluster.completeness < 80 ? 20 : 15;
    } else {
      // Could start a new cluster
      const relatedContent = existingContent.filter((c) =>
        hasOverlap(c.keyword || c.title, kw.keyword),
      );
      if (relatedContent.length >= 2) topicalRelevance = 15;
      else if (relatedContent.length >= 1) topicalRelevance = 10;
    }

    // ------------------------------------------------------------------
    // commercialValue (0-15): transactional/commercial intent?
    // ------------------------------------------------------------------
    let commercialValue = 5;
    if (kw.intent === 'transactional') commercialValue = 15;
    else if (kw.intent === 'commercial') commercialValue = 12;
    else if (kw.intent === 'navigational') commercialValue = 8;
    // informational stays at 5

    // ------------------------------------------------------------------
    // trendingBonus (0-15): trending/seasonal keywords
    // ------------------------------------------------------------------
    let trendingBonus = 5;
    const reason = (kw.reason || '').toLowerCase();
    if (reason.includes('trending') || reason.includes('seasonal') || reason.includes('surge')) {
      trendingBonus = 15;
    } else if (reason.includes('growing') || reason.includes('rising')) {
      trendingBonus = 10;
    }

    // ------------------------------------------------------------------
    // competitorGap (0-15): from competitor gap analysis
    // ------------------------------------------------------------------
    let competitorGap = 5;
    if (reason.includes('competitor') || reason.includes('gap') || reason.includes('missing')) {
      competitorGap = 15;
    } else if (reason.includes('underserved') || reason.includes('opportunity')) {
      competitorGap = 10;
    }

    // ------------------------------------------------------------------
    // contentGap (0-10): no existing content for this keyword
    // ------------------------------------------------------------------
    const alreadyHasContent = existingKeywordsLower.has(kw.keyword.toLowerCase()) ||
      existingContent.some((c) =>
        c.title.toLowerCase().includes(kw.keyword.toLowerCase()),
      );
    const contentGap = alreadyHasContent ? 0 : 10;

    // ------------------------------------------------------------------
    // Total score
    // ------------------------------------------------------------------
    const score = difficultyMatch + topicalRelevance + commercialValue + trendingBonus + competitorGap + contentGap;

    // ------------------------------------------------------------------
    // Determine approach
    // ------------------------------------------------------------------
    let approach: KeywordPriority['approach'];
    let reasoning: string;

    if (alreadyHasContent) {
      approach = 'write-now';
      reasoning = 'Already have related content -- optimize existing or create complementary piece';
    } else if (diff === 'low' && score >= 60) {
      approach = 'write-now';
      reasoning = 'Quick win -- low difficulty keyword matches your site strength';
    } else if (diff === 'high' && da < 30) {
      approach = 'wait-for-authority';
      reasoning = 'High difficulty keyword -- build authority with easier keywords first';
    } else if (matchedCluster && matchedCluster.completeness < 60) {
      approach = 'cluster-first';
      reasoning = `Complete the "${matchedCluster.topic}" cluster first for topical authority`;
    } else if (diff === 'medium' && da < 20) {
      approach = 'long-tail-approach';
      reasoning = 'Target long-tail variants first to build ranking signals';
    } else if (diff === 'low') {
      approach = 'write-now';
      reasoning = 'Low difficulty -- go direct with quality content';
    } else {
      approach = 'cluster-first';
      reasoning = 'Build a topical cluster around this keyword for best results';
    }

    return {
      keyword: kw.keyword,
      score: Math.min(100, score),
      factors: {
        difficultyMatch,
        topicalRelevance,
        commercialValue,
        trendingBonus,
        competitorGap,
        contentGap,
      },
      approach,
      reasoning,
    };
  }).sort((a, b) => b.score - a.score);
}
