/**
 * Keyword Brain -- makes WRITE or SKIP decisions based on real data.
 *
 * Scoring factors:
 * - Search volume (real from Google Autocomplete position, or estimated)
 * - Keyword difficulty (heuristic based on word count, specificity, modifiers)
 * - Site DA (estimated from content volume + age)
 * - Rankability gap: KD - yourDA (negative = you can rank!)
 * - Commercial value (intent classification)
 * - Trending potential (seasonal, news, evergreen)
 *
 * 100% heuristic -- 0 AI credits used.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RankedKeyword {
  keyword: string;
  title: string;
  rankabilityScore: number;         // 0-100, main decision metric
  opportunityScore: number;         // volume x (100 - KD)
  searchVolume: number;             // estimated from autocomplete position
  keywordDifficulty: number;        // 0-100 heuristic
  yourSiteDA: number;               // estimated
  rankabilityGap: number;           // KD - DA (negative = can rank)
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  decision: 'WRITE' | 'SKIP' | 'CONSIDER';
  reason: string;
}

// ---------------------------------------------------------------------------
// Intent classification patterns
// ---------------------------------------------------------------------------

const COMMERCIAL_PATTERNS = [
  /\bbest\b/i, /\btop\s?\d*/i, /\bvs\b/i, /\bversus\b/i,
  /\bcompar/i, /\breview/i, /\balternative/i, /\bcheapest\b/i,
  /\baffordable\b/i, /\bpremium\b/i, /\bbudget\b/i, /\bworth\b/i,
];

const TRANSACTIONAL_PATTERNS = [
  /\bbuy\b/i, /\bprice\b/i, /\bcost\b/i, /\bdiscount\b/i,
  /\bcoupon\b/i, /\bdeal\b/i, /\bsubscri/i, /\bdownload\b/i,
  /\bfree trial\b/i, /\bsign\s?up\b/i, /\bregist/i,
];

const INFORMATIONAL_PATTERNS = [
  /\bhow\s+to\b/i, /\bwhat\s+is\b/i, /\bwhy\b/i, /\bguide\b/i,
  /\btutorial\b/i, /\bexplain/i, /\bmeaning\b/i, /\bdefinition\b/i,
  /\btips\b/i, /\bsteps\b/i, /\bexample/i, /\blearn\b/i,
];

const NAVIGATIONAL_PATTERNS = [
  /\blogin\b/i, /\bsign\s?in\b/i, /\bwebsite\b/i, /\bofficial\b/i,
  /\bapp\b/i, /\bdownload\b/i, /\bcontact\b/i,
];

// Brand-like patterns: single capitalized word, .com, known brands
const BRAND_PATTERNS = [
  /\b(?:google|amazon|facebook|meta|apple|microsoft|netflix)\b/i,
  /\.com\b/i, /\.io\b/i, /\.org\b/i,
];

// Modifiers that signal lower competition (easier to rank)
const LOW_COMP_MODIFIERS = [
  /\b20(?:2[4-9]|[3-9]\d)\b/, // years 2024-2099
  /\bfor\s+beginners?\b/i, /\bstep\s+by\s+step\b/i,
  /\bin\s+india\b/i, /\bfor\s+\w+\s+year\s+old\b/i,
  /\bwithout\b/i, /\bfree\b/i, /\bat\s+home\b/i,
];

// ---------------------------------------------------------------------------
// Core scoring functions
// ---------------------------------------------------------------------------

/**
 * Estimate search volume from autocomplete position.
 * Position 1-3 = high volume, 4-7 = medium, 8-10 = low, absent = very low.
 */
export function estimateVolumeFromPosition(position: number): number {
  if (position <= 0) return 50; // not in autocomplete
  if (position <= 1) return 5000;
  if (position <= 2) return 3000;
  if (position <= 3) return 1500;
  if (position <= 5) return 800;
  if (position <= 7) return 500;
  if (position <= 10) return 200;
  return 100;
}

/**
 * Estimate keyword difficulty from keyword characteristics.
 * Pure heuristic -- 0 credits.
 */
export function estimateKeywordDifficulty(keyword: string): number {
  const words = keyword.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  let kd = 50; // base difficulty

  // Word count factor
  if (wordCount <= 1) kd += 30;       // single word = very hard
  else if (wordCount === 2) kd += 15;  // two words = hard
  else if (wordCount >= 5) kd -= 20;   // long tail = easier
  else if (wordCount >= 4) kd -= 10;   // medium long tail

  // Commercial modifiers (medium competition)
  if (COMMERCIAL_PATTERNS.some((p) => p.test(keyword))) kd += 5;

  // Transactional (high competition)
  if (TRANSACTIONAL_PATTERNS.some((p) => p.test(keyword))) kd += 10;

  // Informational (lower competition)
  if (INFORMATIONAL_PATTERNS.some((p) => p.test(keyword))) kd -= 10;

  // Low competition modifiers
  const lowCompCount = LOW_COMP_MODIFIERS.filter((p) => p.test(keyword)).length;
  kd -= lowCompCount * 8;

  // Brand names = very hard (skip)
  if (BRAND_PATTERNS.some((p) => p.test(keyword))) kd += 25;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(kd)));
}

/**
 * Classify search intent from keyword text.
 */
export function classifyIntent(
  keyword: string,
): 'informational' | 'commercial' | 'transactional' | 'navigational' {
  if (NAVIGATIONAL_PATTERNS.some((p) => p.test(keyword))) return 'navigational';
  if (TRANSACTIONAL_PATTERNS.some((p) => p.test(keyword))) return 'transactional';
  if (COMMERCIAL_PATTERNS.some((p) => p.test(keyword))) return 'commercial';
  return 'informational';
}

/**
 * Generate an optimized article title from a keyword.
 */
export function generateTitle(keyword: string): string {
  const kw = keyword.trim();
  const intent = classifyIntent(kw);
  const currentYear = new Date().getFullYear();
  const hasYear = /\b20\d{2}\b/.test(kw);

  switch (intent) {
    case 'commercial':
      return hasYear ? capitalizeFirst(kw) : `${capitalizeFirst(kw)} (${currentYear} Guide)`;
    case 'transactional':
      return `${capitalizeFirst(kw)} -- Complete Guide`;
    case 'informational': {
      if (/\bhow\s+to\b/i.test(kw)) return `${capitalizeFirst(kw)} (Step-by-Step Guide)`;
      if (/\bwhat\s+is\b/i.test(kw)) return `${capitalizeFirst(kw)} -- Everything You Need to Know`;
      return hasYear ? capitalizeFirst(kw) : `${capitalizeFirst(kw)} -- A Complete Guide (${currentYear})`;
    }
    default:
      return capitalizeFirst(kw);
  }
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// Main scoring
// ---------------------------------------------------------------------------

/**
 * Score a keyword with real intelligence (0 AI credits -- pure heuristic).
 */
export function scoreKeyword(
  keyword: string,
  siteDA: number,
  existingContent: string[],
  autocompletePosition: number = 0,
): RankedKeyword {
  const kd = estimateKeywordDifficulty(keyword);
  const volume = autocompletePosition > 0
    ? estimateVolumeFromPosition(autocompletePosition)
    : estimateVolumeFromFallback(keyword);
  const intent = classifyIntent(keyword);
  const gap = kd - siteDA;
  const title = generateTitle(keyword);

  // Opportunity score: volume weighted by ease of ranking
  const opportunityScore = Math.round((volume / 50) * ((100 - kd) / 100));

  // Rankability: how likely YOU can rank for this keyword
  let rankability = 50;

  // Gap factor: negative gap = you outclass the competition
  if (gap <= -20) rankability += 25;
  else if (gap <= -10) rankability += 15;
  else if (gap <= 0) rankability += 5;
  else if (gap >= 20) rankability -= 20;
  else if (gap >= 10) rankability -= 10;

  // Volume bonus
  if (volume >= 1000) rankability += 10;
  else if (volume >= 500) rankability += 5;
  else if (volume < 100) rankability -= 5;

  // Intent bonus (commercial & informational are good for content sites)
  if (intent === 'commercial') rankability += 10;
  if (intent === 'informational') rankability += 5;
  if (intent === 'navigational') rankability -= 15;

  // Long-tail bonus
  const wordCount = keyword.split(/\s+/).length;
  if (wordCount >= 4) rankability += 5;
  if (wordCount >= 6) rankability += 5;

  // Freshness bonus (has current/recent year)
  const currentYear = new Date().getFullYear();
  if (keyword.includes(String(currentYear))) rankability += 10;

  // Penalty for duplicate topic
  const kwLower = keyword.toLowerCase();
  const hasSimilar = existingContent.some((title) => {
    const titleLower = title.toLowerCase();
    return titleLower.includes(kwLower) || kwLower.includes(titleLower);
  });
  if (hasSimilar) rankability -= 20;

  rankability = Math.max(0, Math.min(100, Math.round(rankability)));

  // Decision
  let decision: 'WRITE' | 'SKIP' | 'CONSIDER';
  let reason: string;

  if (intent === 'navigational') {
    decision = 'SKIP';
    reason = 'Navigational intent -- cannot outrank the brand itself';
  } else if (hasSimilar) {
    decision = 'CONSIDER';
    reason = 'Similar content already exists -- consider updating instead of creating new';
  } else if (rankability >= 65) {
    decision = 'WRITE';
    reason = `Good opportunity: KD ${kd} vs your DA ${siteDA} (gap: ${gap}). ${volume >= 500 ? 'Decent volume.' : 'Lower volume but winnable.'} ${intent === 'commercial' ? 'Commercial intent = monetizable.' : ''}`;
  } else if (rankability >= 40) {
    decision = 'CONSIDER';
    reason = `Moderate opportunity. KD ${kd} vs your DA ${siteDA}. ${gap > 0 ? 'Competition exceeds your authority.' : 'You can compete.'} May need more domain authority.`;
  } else {
    decision = 'SKIP';
    reason = `Low rankability. KD ${kd} is too high for DA ${siteDA}. Focus on lower-difficulty keywords first.`;
  }

  return {
    keyword,
    title,
    rankabilityScore: rankability,
    opportunityScore: Math.max(0, Math.min(100, opportunityScore)),
    searchVolume: volume,
    keywordDifficulty: kd,
    yourSiteDA: siteDA,
    rankabilityGap: gap,
    intent,
    decision,
    reason,
  };
}

/**
 * Batch score and rank keywords, sorted by rankability score descending.
 */
export function rankKeywords(
  keywords: string[],
  siteDA: number,
  existingContent: string[],
  positions: Record<string, number> = {},
): RankedKeyword[] {
  return keywords
    .map((kw) => scoreKeyword(kw, siteDA, existingContent, positions[kw.toLowerCase()] || 0))
    .sort((a, b) => b.rankabilityScore - a.rankabilityScore);
}

// ---------------------------------------------------------------------------
// Fallback volume estimation (when no autocomplete position available)
// ---------------------------------------------------------------------------

function estimateVolumeFromFallback(keyword: string): number {
  const words = keyword.split(/\s+/).length;
  // Shorter keywords tend to have more volume
  if (words <= 1) return 2000;
  if (words === 2) return 800;
  if (words === 3) return 400;
  if (words === 4) return 200;
  return 100;
}
