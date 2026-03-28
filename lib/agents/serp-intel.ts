/**
 * SERP Intelligence -- analyses competition and decides content strategy.
 *
 * Without a real SERP API we rely on:
 * - AI to estimate what LIKELY ranks (based on training data)
 * - GSC real data (when connected) for actual positions
 * - Heuristic site-strength estimation
 * - Content gap analysis from competitor domain knowledge
 */

import { callAI } from '@/lib/ai/call-ai';
import type { ContentItem, Keyword } from '@/types/content';
import type { AutopilotEngineConfig, KeywordSuggestion } from '@/lib/autopilot/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SiteStrength {
  domain: string;
  estimatedDA: number;
  contentVolume: number;
  avgContentLength: number;
  avgSEOScore: number;
  topicalClusters: number;
  internalLinkDensity: number;
  contentAge: number;
  publishFrequency: number;
  strengths: string[];
  weaknesses: string[];
}

export interface SERPAnalysis {
  keyword: string;
  estimatedCompetition: 'low' | 'medium' | 'high' | 'very-high';
  topResultsLikely: {
    position: number;
    estimatedType: 'article' | 'guide' | 'listicle' | 'comparison' | 'tool' | 'forum';
    estimatedWordCount: string;
    estimatedHeadings: number;
    hasImages: boolean;
    hasVideo: boolean;
    hasFAQ: boolean;
    hasSchema: boolean;
    domainType: 'authority' | 'niche' | 'ugc' | 'news';
  }[];
  contentRequirements: {
    minWordCount: number;
    recommendedWordCount: number;
    requiredSections: string[];
    recommendedMedia: string[];
    schemaTypes: string[];
    uniqueAngle: string;
  };
  canWeRank: {
    probability: 'high' | 'medium' | 'low';
    reasoning: string;
    timeToRank: string;
    requiredActions: string[];
  };
}

export interface StrategyRecommendation {
  keyword: string;
  priority: number;
  approach: 'direct' | 'long-tail-first' | 'topical-cluster' | 'skyscraper' | 'semantic-expansion';
  reasoning: string;
  steps: string[];
  estimatedCredits: number;
  estimatedTimeToRank: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseJSON<T>(text: string): T | null {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
    }
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function countInternalLinks(body: string): number {
  const linkPattern = /\[([^\]]*)\]\(([^)]*)\)/g;
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(body)) !== null) {
    const href = match[2];
    if (href && !href.startsWith('http')) {
      count++;
    }
  }
  return count;
}

function groupByCluster(content: ContentItem[]): Map<string, ContentItem[]> {
  const clusters = new Map<string, ContentItem[]>();
  for (const item of content) {
    const key = item.collection || 'uncategorized';
    const existing = clusters.get(key) || [];
    existing.push(item);
    clusters.set(key, existing);
  }
  return clusters;
}

// ---------------------------------------------------------------------------
// estimateSiteStrength  (0 credits -- pure heuristic)
// ---------------------------------------------------------------------------

export function estimateSiteStrength(
  content: ContentItem[],
  keywords: Keyword[],
  domain: string,
): SiteStrength {
  const published = content.filter((c) => c.status === 'published');
  const contentVolume = published.length;

  // Average word count
  const totalWords = published.reduce((acc, c) => acc + (c.wordCount || 0), 0);
  const avgContentLength = contentVolume > 0 ? Math.round(totalWords / contentVolume) : 0;

  // Average SEO score
  const totalSEO = published.reduce((acc, c) => acc + (c.seoScore || 0), 0);
  const avgSEOScore = contentVolume > 0 ? Math.round(totalSEO / contentVolume) : 0;

  // Topic clusters (group by collection)
  const clusters = groupByCluster(published);
  const topicalClusters = clusters.size;

  // Internal link density
  let totalLinks = 0;
  for (const item of published) {
    const body = item.content || item.body || '';
    totalLinks += countInternalLinks(body);
  }
  const internalLinkDensity = contentVolume > 0 ? Math.round((totalLinks / contentVolume) * 10) / 10 : 0;

  // Content age (average days since created)
  const now = Date.now();
  const totalAge = published.reduce((acc, c) => acc + (now - (c.created || now)), 0);
  const contentAge = contentVolume > 0 ? Math.round(totalAge / contentVolume / 86400000) : 0;

  // Publish frequency (articles per week over last 30 days)
  const thirtyDaysAgo = now - 30 * 86400000;
  const recentCount = published.filter((c) => (c.created || 0) >= thirtyDaysAgo).length;
  const publishFrequency = Math.round((recentCount / 4.3) * 10) / 10; // 4.3 weeks in 30 days

  // Estimate DA (0-100)
  let estimatedDA = 5; // base for brand-new site

  // Content volume bonus (max +25)
  if (contentVolume >= 200) estimatedDA += 25;
  else if (contentVolume >= 100) estimatedDA += 20;
  else if (contentVolume >= 50) estimatedDA += 15;
  else if (contentVolume >= 20) estimatedDA += 10;
  else if (contentVolume >= 5) estimatedDA += 5;

  // Quality bonus (max +20)
  if (avgSEOScore >= 80) estimatedDA += 20;
  else if (avgSEOScore >= 60) estimatedDA += 12;
  else if (avgSEOScore >= 40) estimatedDA += 6;

  // Topical focus bonus (max +15)
  const focusRatio = topicalClusters > 0 && contentVolume > 0
    ? contentVolume / topicalClusters
    : 0;
  if (focusRatio >= 10) estimatedDA += 15; // deeply focused niches
  else if (focusRatio >= 5) estimatedDA += 10;
  else if (focusRatio >= 3) estimatedDA += 5;

  // Content age bonus (max +15)
  if (contentAge >= 365) estimatedDA += 15;
  else if (contentAge >= 180) estimatedDA += 10;
  else if (contentAge >= 90) estimatedDA += 5;

  // Internal linking bonus (max +10)
  if (internalLinkDensity >= 3) estimatedDA += 10;
  else if (internalLinkDensity >= 1.5) estimatedDA += 6;
  else if (internalLinkDensity >= 0.5) estimatedDA += 3;

  // Keyword rankings bonus (max +15)
  const topRankings = keywords.filter((k) => k.status === 'top5' || k.status === 'top10').length;
  if (topRankings >= 20) estimatedDA += 15;
  else if (topRankings >= 10) estimatedDA += 10;
  else if (topRankings >= 3) estimatedDA += 5;

  estimatedDA = Math.min(estimatedDA, 100);

  // Strengths & weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (contentVolume >= 20) strengths.push('Good content volume');
  else weaknesses.push('Low content volume - publish more');

  if (avgSEOScore >= 70) strengths.push('Strong average SEO scores');
  else weaknesses.push('SEO scores need improvement');

  if (avgContentLength >= 1500) strengths.push('Detailed, comprehensive articles');
  else if (avgContentLength < 800) weaknesses.push('Thin content - increase word count');

  if (internalLinkDensity >= 2) strengths.push('Good internal linking');
  else weaknesses.push('Weak internal linking - add more cross-links');

  if (focusRatio >= 5) strengths.push('Strong topical focus');
  else if (topicalClusters > 5 && focusRatio < 3) weaknesses.push('Too many topics without depth');

  if (publishFrequency >= 2) strengths.push('Consistent publishing schedule');
  else weaknesses.push('Irregular publishing - aim for 2+ articles/week');

  if (contentAge < 90) weaknesses.push('Low domain age - authority takes time');
  else if (contentAge >= 365) strengths.push('Established domain age');

  if (topRankings >= 5) strengths.push(`${topRankings} keywords ranking in top 10`);
  else weaknesses.push('Few top rankings - focus on low-competition keywords');

  return {
    domain,
    estimatedDA,
    contentVolume,
    avgContentLength,
    avgSEOScore,
    topicalClusters,
    internalLinkDensity,
    contentAge,
    publishFrequency,
    strengths,
    weaknesses,
  };
}

// ---------------------------------------------------------------------------
// analyzeSERP  (1 credit -- AI estimation)
// ---------------------------------------------------------------------------

export async function analyzeSERP(
  keyword: string,
  siteStrength: SiteStrength,
  config: AutopilotEngineConfig,
  settings: Record<string, string>,
): Promise<SERPAnalysis> {
  const prompt = `Analyse the Google SERP for the keyword: "${keyword}"

My site context:
- Domain: ${siteStrength.domain || config.domain || 'new site'}
- Estimated DA: ${siteStrength.estimatedDA}
- Published articles: ${siteStrength.contentVolume}
- Average SEO score: ${siteStrength.avgSEOScore}
- Niche: ${config.niche}
- Target audience: ${config.targetAudience}

Based on your knowledge of what currently ranks for this keyword:

1. What is the estimated competition level? (low / medium / high / very-high)
2. What do the top 5 results likely look like? For each give:
   - position (1-5)
   - estimatedType (article / guide / listicle / comparison / tool / forum)
   - estimatedWordCount (range like "1500-2500")
   - estimatedHeadings (number)
   - hasImages, hasVideo, hasFAQ, hasSchema (boolean)
   - domainType (authority / niche / ugc / news)
3. What would new content need to compete?
   - minWordCount, recommendedWordCount
   - requiredSections (array of section titles)
   - recommendedMedia (e.g. "comparison table", "infographic", "calculator")
   - schemaTypes (e.g. "Article", "FAQ", "HowTo")
   - uniqueAngle (string -- what would make our content stand out)
4. Can we realistically rank?
   - probability (high / medium / low)
   - reasoning (explain why)
   - timeToRank (e.g. "2-4 weeks", "1-3 months", "3-6 months")
   - requiredActions (array of things to do first)

Return ONLY valid JSON matching this structure:
{
  "keyword": "${keyword}",
  "estimatedCompetition": "...",
  "topResultsLikely": [...],
  "contentRequirements": {...},
  "canWeRank": {...}
}`;

  const raw = await callAI(prompt, {
    system: 'You are an expert SEO analyst. Return ONLY valid JSON.',
    maxTokens: 2500,
  }, settings);

  const parsed = safeParseJSON<SERPAnalysis>(raw);
  if (!parsed) {
    return {
      keyword,
      estimatedCompetition: 'medium',
      topResultsLikely: [],
      contentRequirements: {
        minWordCount: 1500,
        recommendedWordCount: 2500,
        requiredSections: ['Introduction', 'Main Content', 'FAQ', 'Conclusion'],
        recommendedMedia: ['images', 'tables'],
        schemaTypes: ['Article'],
        uniqueAngle: 'Unable to determine - try again',
      },
      canWeRank: {
        probability: 'medium',
        reasoning: 'Analysis unavailable',
        timeToRank: '1-3 months',
        requiredActions: ['Create quality content', 'Build internal links'],
      },
    };
  }

  return { ...parsed, keyword };
}

// ---------------------------------------------------------------------------
// generateStrategy  (1 credit per batch -- AI-powered prioritization)
// ---------------------------------------------------------------------------

export async function generateStrategy(
  keywords: KeywordSuggestion[],
  siteStrength: SiteStrength,
  existingContent: ContentItem[],
  config: AutopilotEngineConfig,
  settings: Record<string, string>,
): Promise<StrategyRecommendation[]> {
  if (keywords.length === 0) return [];

  const kwList = keywords
    .slice(0, 20)
    .map((k) => `- ${k.keyword} (vol: ${k.estimatedVolume}, diff: ${k.estimatedDifficulty}, intent: ${k.intent}, score: ${k.score})`)
    .join('\n');

  const existingTitles = existingContent
    .slice(0, 30)
    .map((c) => c.title)
    .join(', ');

  const prompt = `Create a content strategy for these keywords.

Site profile:
- DA: ${siteStrength.estimatedDA}, articles: ${siteStrength.contentVolume}
- Avg SEO: ${siteStrength.avgSEOScore}, clusters: ${siteStrength.topicalClusters}
- Niche: ${config.niche}
- Goal: ${config.contentGoal}

Existing content titles: ${existingTitles || 'none'}

Keywords to prioritise:
${kwList}

For each keyword, recommend:
- priority (1-100, higher = do first)
- approach: direct | long-tail-first | topical-cluster | skyscraper | semantic-expansion
- reasoning (one sentence)
- steps (array of action steps)
- estimatedCredits (how many AI credits needed)
- estimatedTimeToRank (e.g. "2-4 weeks")

Prioritisation rules:
1. Low difficulty + high volume = quick wins, target FIRST
2. Keywords with related existing content = topical cluster advantage
3. Long-tail variants of head terms = build authority bottom-up
4. Semantic siblings = cover topic comprehensively
5. Commercial intent = revenue potential
6. Trending/seasonal = time-sensitive

Return ONLY a valid JSON array of objects with fields: keyword, priority, approach, reasoning, steps, estimatedCredits, estimatedTimeToRank`;

  const raw = await callAI(prompt, {
    system: 'You are an SEO strategist. Return ONLY valid JSON arrays.',
    maxTokens: 3000,
  }, settings);

  const parsed = safeParseJSON<StrategyRecommendation[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return [];

  return parsed
    .map((r) => ({
      ...r,
      priority: Math.max(0, Math.min(100, r.priority || 50)),
    }))
    .sort((a, b) => b.priority - a.priority);
}
