/**
 * SERP Analyzer -- estimates what it takes to rank for a keyword.
 *
 * Uses a combination of:
 * - AI estimation of competitor content (1 credit)
 * - Heuristic analysis of keyword characteristics (0 credits)
 * - Google Autocomplete data (0 credits, if available)
 *
 * Returns: recommended word count, content structure, difficulty assessment
 */

import { callAI } from '@/lib/ai/call-ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SERPAnalysis {
  keyword: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'very-hard';
  recommendedWordCount: number;
  minimumWordCount: number;
  requiredElements: string[];
  contentType: string;
  estimatedCompetitors: {
    type: string;
    wordCount: number;
    hasImages: boolean;
    hasFAQ: boolean;
  }[];
  uniqueAngle: string;
  timeToRank: string;
  canYouRank: boolean;
  rankingProbability: number;
}

// ---------------------------------------------------------------------------
// Keyword classifiers (internal helpers)
// ---------------------------------------------------------------------------

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isBestKeyword(kw: string): boolean {
  const l = kw.toLowerCase();
  return l.startsWith('best ') || l.includes(' best ') || l.includes(' top ');
}

function isHowToKeyword(kw: string): boolean {
  const l = kw.toLowerCase();
  return l.startsWith('how to ') || l.startsWith('how do ') || l.startsWith('how can ');
}

function isVsKeyword(kw: string): boolean {
  return / vs\.? /i.test(kw) || / versus /i.test(kw) || / compared to /i.test(kw);
}

function isQuestionKeyword(kw: string): boolean {
  const l = kw.toLowerCase();
  return (
    l.startsWith('what ') ||
    l.startsWith('why ') ||
    l.startsWith('when ') ||
    l.startsWith('where ') ||
    l.startsWith('who ') ||
    l.startsWith('which ') ||
    l.startsWith('is ') ||
    l.startsWith('are ') ||
    l.startsWith('can ') ||
    l.startsWith('do ') ||
    l.startsWith('does ') ||
    l.endsWith('?')
  );
}

function isListKeyword(kw: string): boolean {
  const l = kw.toLowerCase();
  return /\d+ /.test(l) || l.includes(' list') || l.includes(' ideas') || l.includes(' examples') || l.includes(' tips');
}

// ---------------------------------------------------------------------------
// Detect content type
// ---------------------------------------------------------------------------

function detectContentType(kw: string): string {
  if (isHowToKeyword(kw)) return 'how-to';
  if (isVsKeyword(kw)) return 'comparison';
  if (isBestKeyword(kw)) return 'comparison';
  if (isListKeyword(kw)) return 'listicle';
  if (isQuestionKeyword(kw)) return 'guide';
  return 'guide';
}

// ---------------------------------------------------------------------------
// Detect required elements
// ---------------------------------------------------------------------------

function detectRequiredElements(kw: string, contentType: string): string[] {
  const elements: string[] = [];

  if (contentType === 'comparison' || isBestKeyword(kw) || isVsKeyword(kw)) {
    elements.push('comparison table', 'pros/cons lists');
  }

  if (contentType === 'how-to' || isHowToKeyword(kw)) {
    elements.push('step-by-step instructions', 'images/screenshots');
  }

  if (isQuestionKeyword(kw)) {
    elements.push('direct answer in first paragraph', 'FAQ schema markup');
  }

  if (contentType === 'listicle') {
    elements.push('numbered sections', 'summary table');
  }

  // Universal elements for good SEO
  elements.push('meta title under 60 chars', 'meta description under 155 chars');

  if (!elements.includes('images/screenshots')) {
    elements.push('at least 2-3 images');
  }

  elements.push('internal links to related content');
  elements.push('external links to authoritative sources');

  return elements;
}

// ---------------------------------------------------------------------------
// Heuristic SERP analysis (0 credits)
// ---------------------------------------------------------------------------

export function heuristicSERPAnalysis(keyword: string, siteDA: number = 20): SERPAnalysis {
  const kw = keyword.trim();
  const words = wordCount(kw);
  const contentType = detectContentType(kw);
  const requiredElements = detectRequiredElements(kw, contentType);

  // Difficulty based on keyword length
  let difficulty: SERPAnalysis['difficulty'];
  let recommendedWordCount: number;
  let minimumWordCount: number;
  let timeToRank: string;
  let baseProbability: number;

  if (words <= 2) {
    // Short head keywords: very competitive
    difficulty = 'very-hard';
    recommendedWordCount = 3500;
    minimumWordCount = 3000;
    timeToRank = '3-6 months';
    baseProbability = 15;
  } else if (words <= 4) {
    // Medium keywords
    difficulty = 'hard';
    recommendedWordCount = 2500;
    minimumWordCount = 2000;
    timeToRank = '1-3 months';
    baseProbability = 35;
  } else {
    // Long-tail keywords
    difficulty = 'easy';
    recommendedWordCount = 1500;
    minimumWordCount = 1200;
    timeToRank = '2-4 weeks';
    baseProbability = 65;
  }

  // Adjust for special keyword types
  if (isBestKeyword(kw)) {
    recommendedWordCount = Math.max(recommendedWordCount, 2500);
    minimumWordCount = Math.max(minimumWordCount, 2000);
    if (difficulty === 'easy') difficulty = 'medium';
  }

  if (isVsKeyword(kw)) {
    recommendedWordCount = Math.max(recommendedWordCount, 2000);
    minimumWordCount = Math.max(minimumWordCount, 1500);
  }

  // Adjust probability based on site DA
  let daBonus = 0;
  if (siteDA >= 50) daBonus = 20;
  else if (siteDA >= 30) daBonus = 10;
  else if (siteDA >= 20) daBonus = 5;
  else daBonus = -5;

  const rankingProbability = Math.min(95, Math.max(5, baseProbability + daBonus));
  const canYouRank = rankingProbability >= 30;

  // Generate estimated competitors
  const estimatedCompetitors = generateHeuristicCompetitors(contentType, difficulty);

  // Generate unique angle
  const uniqueAngle = generateUniqueAngle(kw, contentType);

  return {
    keyword: kw,
    difficulty,
    recommendedWordCount,
    minimumWordCount,
    requiredElements,
    contentType,
    estimatedCompetitors,
    uniqueAngle,
    timeToRank,
    canYouRank,
    rankingProbability,
  };
}

// ---------------------------------------------------------------------------
// Heuristic competitor estimates
// ---------------------------------------------------------------------------

function generateHeuristicCompetitors(
  contentType: string,
  difficulty: SERPAnalysis['difficulty'],
): SERPAnalysis['estimatedCompetitors'] {
  const baseWordCount =
    difficulty === 'very-hard' ? 3000
    : difficulty === 'hard' ? 2200
    : difficulty === 'medium' ? 1800
    : 1200;

  return [
    {
      type: 'Authority site (DA 60+)',
      wordCount: baseWordCount + 500,
      hasImages: true,
      hasFAQ: contentType === 'guide' || contentType === 'how-to',
    },
    {
      type: 'Niche blog (DA 30-50)',
      wordCount: baseWordCount,
      hasImages: true,
      hasFAQ: false,
    },
    {
      type: 'Forum / UGC',
      wordCount: Math.round(baseWordCount * 0.6),
      hasImages: false,
      hasFAQ: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Unique angle generator
// ---------------------------------------------------------------------------

function generateUniqueAngle(kw: string, contentType: string): string {
  const currentYear = new Date().getFullYear();

  if (contentType === 'comparison') {
    return `Include real user testimonials and ${currentYear} pricing data that competitors lack`;
  }
  if (contentType === 'how-to') {
    return `Add a video walkthrough and downloadable checklist that competitors don't offer`;
  }
  if (contentType === 'listicle') {
    return `Go deeper than competitors: include expert quotes, real examples, and actionable takeaways for each item`;
  }
  return `Provide first-hand experience, original data, or expert interviews that competitors don't have`;
}

// ---------------------------------------------------------------------------
// AI-powered SERP analysis (1 credit)
// ---------------------------------------------------------------------------

export async function aiSERPAnalysis(
  keyword: string,
  niche: string,
  siteDA: number = 20,
  settings: Record<string, string> = {},
): Promise<SERPAnalysis> {
  // Start with heuristic as a baseline
  const heuristic = heuristicSERPAnalysis(keyword, siteDA);

  const prompt = `Analyze the keyword "${keyword}" for a ${niche} website with Domain Authority ${siteDA}.

Estimate what the top 5 Google results look like for this keyword. Consider:
1. What types of sites rank (authority blogs, forums, ecommerce, news)?
2. How long is the typical ranking content?
3. What content format dominates (guides, listicles, comparisons, videos)?
4. What required elements do top pages have (tables, FAQs, images, calculators)?
5. What unique angle could beat existing results?
6. How hard is it to rank and how long would it take?

Return a valid JSON object (no markdown fences) with this exact shape:
{
  "difficulty": "easy" | "medium" | "hard" | "very-hard",
  "recommendedWordCount": number,
  "minimumWordCount": number,
  "requiredElements": string[],
  "contentType": "guide" | "listicle" | "comparison" | "how-to",
  "estimatedCompetitors": [{ "type": string, "wordCount": number, "hasImages": boolean, "hasFAQ": boolean }],
  "uniqueAngle": string,
  "timeToRank": string,
  "canYouRank": boolean,
  "rankingProbability": number
}`;

  try {
    const result = await callAI(prompt, {
      system: 'You are an expert SEO analyst. Return only valid JSON, no markdown, no explanation.',
      maxTokens: 1200,
    }, settings);

    // Parse the AI response
    const cleaned = result.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
    const parsed = JSON.parse(cleaned) as Omit<SERPAnalysis, 'keyword'>;

    return {
      keyword,
      difficulty: parsed.difficulty || heuristic.difficulty,
      recommendedWordCount: parsed.recommendedWordCount || heuristic.recommendedWordCount,
      minimumWordCount: parsed.minimumWordCount || heuristic.minimumWordCount,
      requiredElements: parsed.requiredElements?.length ? parsed.requiredElements : heuristic.requiredElements,
      contentType: parsed.contentType || heuristic.contentType,
      estimatedCompetitors: parsed.estimatedCompetitors?.length ? parsed.estimatedCompetitors : heuristic.estimatedCompetitors,
      uniqueAngle: parsed.uniqueAngle || heuristic.uniqueAngle,
      timeToRank: parsed.timeToRank || heuristic.timeToRank,
      canYouRank: typeof parsed.canYouRank === 'boolean' ? parsed.canYouRank : heuristic.canYouRank,
      rankingProbability: typeof parsed.rankingProbability === 'number' ? parsed.rankingProbability : heuristic.rankingProbability,
    };
  } catch {
    // If AI fails, fall back to heuristic
    return heuristic;
  }
}
