/**
 * Fact Checker -- validates content before publishing.
 * Heuristic checks (0 credits) + optional AI verification (1 credit).
 *
 * Checks:
 * - Date references (are they current or outdated?)
 * - Number claims (are percentages/amounts reasonable?)
 * - URL references (are they real domains?)
 * - Statistical claims (flagged for manual verification)
 * - Outdated information markers ("in 2023", "last year")
 */

import { callAI } from '@/lib/ai/call-ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FactCheckResult {
  passed: boolean;
  confidence: number;      // 0-100
  issues: FactCheckIssue[];
  suggestions: string[];
}

export interface FactCheckIssue {
  type: 'error' | 'warning' | 'info';
  category: 'date' | 'number' | 'claim' | 'outdated' | 'url';
  message: string;
  location: string;        // the text snippet containing the issue
}

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

// Match 4-digit years
const YEAR_REGEX = /\b(20[0-2]\d)\b/g;

// Match percentages
const PERCENT_REGEX = /(\d+(?:\.\d+)?)\s*%/g;

// Match dollar/rupee amounts
const MONEY_REGEX = /(?:\$|Rs\.?|INR|USD)\s*(\d[\d,]*(?:\.\d{1,2})?)/gi;

// Match URLs
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

// Match vague time references
const VAGUE_TIME_REGEX = /\b(last\s+year|recently|currently|at\s+present|this\s+year|nowadays|these\s+days)\b/gi;

// Match superlatives without source
const SUPERLATIVE_REGEX = /\b(the\s+best|#1|number\s+one|most\s+popular|leading|top-rated|highest-rated|world['']?s\s+(?:best|largest|fastest))\b/gi;

// Match large number claims
const LARGE_NUMBER_REGEX = /(\d[\d,]*(?:\.\d+)?)\s*(?:million|billion|trillion|crore|lakh)/gi;

// ---------------------------------------------------------------------------
// Heuristic fact check (0 credits)
// ---------------------------------------------------------------------------

export function heuristicFactCheck(
  content: string,
  currentYear?: number,
): FactCheckResult {
  const year = currentYear || new Date().getFullYear();
  const issues: FactCheckIssue[] = [];
  const suggestions: string[] = [];

  // --- Check dates / years ---
  let match: RegExpExecArray | null;
  const yearRegex = new RegExp(YEAR_REGEX.source, 'g');
  while ((match = yearRegex.exec(content)) !== null) {
    const foundYear = parseInt(match[1], 10);
    if (foundYear < year - 1) {
      const context = extractContext(content, match.index);
      issues.push({
        type: 'warning',
        category: 'date',
        message: `Reference to ${foundYear} may be outdated (current year: ${year})`,
        location: context,
      });
    }
  }

  // --- Check for vague time references ---
  const vagueRegex = new RegExp(VAGUE_TIME_REGEX.source, 'gi');
  while ((match = vagueRegex.exec(content)) !== null) {
    const context = extractContext(content, match.index);
    issues.push({
      type: 'info',
      category: 'outdated',
      message: `Vague time reference "${match[0]}" -- consider using a specific date or year`,
      location: context,
    });
  }

  // --- Check percentages ---
  const percentRegex = new RegExp(PERCENT_REGEX.source, 'g');
  while ((match = percentRegex.exec(content)) !== null) {
    const pct = parseFloat(match[1]);
    if (pct > 100) {
      const context = extractContext(content, match.index);
      issues.push({
        type: 'warning',
        category: 'number',
        message: `Percentage ${pct}% exceeds 100% -- verify this claim`,
        location: context,
      });
    } else if (pct === 0) {
      const context = extractContext(content, match.index);
      issues.push({
        type: 'info',
        category: 'number',
        message: '0% claim -- verify this is intentional',
        location: context,
      });
    }
  }

  // --- Check for superlatives without source ---
  const superRegex = new RegExp(SUPERLATIVE_REGEX.source, 'gi');
  while ((match = superRegex.exec(content)) !== null) {
    const context = extractContext(content, match.index);
    issues.push({
      type: 'warning',
      category: 'claim',
      message: `Unverified superlative claim: "${match[0]}" -- add a source or rephrase`,
      location: context,
    });
  }

  // --- Check URLs for obviously broken patterns ---
  const urlRegex = new RegExp(URL_REGEX.source, 'gi');
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0];
    // Check for obviously malformed URLs
    if (url.includes('example.com') || url.includes('placeholder')) {
      const context = extractContext(content, match.index);
      issues.push({
        type: 'error',
        category: 'url',
        message: `Placeholder URL detected: ${url}`,
        location: context,
      });
    }
    // Check for URLs ending with common typo patterns
    if (url.endsWith('.') || url.endsWith(',')) {
      const context = extractContext(content, match.index);
      issues.push({
        type: 'info',
        category: 'url',
        message: `URL may have trailing punctuation: ${url}`,
        location: context,
      });
    }
  }

  // --- Check large number claims ---
  const largeNumRegex = new RegExp(LARGE_NUMBER_REGEX.source, 'gi');
  while ((match = largeNumRegex.exec(content)) !== null) {
    const context = extractContext(content, match.index);
    issues.push({
      type: 'info',
      category: 'claim',
      message: `Large number claim "${match[0]}" -- ensure this is sourced and current`,
      location: context,
    });
  }

  // --- Check money amounts ---
  const moneyRegex = new RegExp(MONEY_REGEX.source, 'gi');
  while ((match = moneyRegex.exec(content)) !== null) {
    // Flag very large amounts as needing verification
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (amount >= 1_000_000) {
      const context = extractContext(content, match.index);
      issues.push({
        type: 'info',
        category: 'number',
        message: `Large monetary amount -- verify: ${match[0]}`,
        location: context,
      });
    }
  }

  // --- Generate suggestions ---
  const errorCount = issues.filter((i) => i.type === 'error').length;
  const warningCount = issues.filter((i) => i.type === 'warning').length;

  if (errorCount > 0) suggestions.push('Fix errors before publishing');
  if (warningCount > 3) suggestions.push('Multiple warnings detected -- consider a thorough review');
  if (issues.some((i) => i.category === 'date')) suggestions.push('Update date references to the current year');
  if (issues.some((i) => i.category === 'claim')) suggestions.push('Add sources for factual claims');
  if (issues.some((i) => i.category === 'outdated')) suggestions.push('Replace vague time references with specific dates');

  // Calculate confidence
  const totalChecks = 7; // number of check categories
  const failedChecks = new Set(issues.map((i) => i.category)).size;
  const confidence = Math.round(((totalChecks - failedChecks) / totalChecks) * 100);

  return {
    passed: errorCount === 0 && warningCount <= 2,
    confidence,
    issues,
    suggestions,
  };
}

// ---------------------------------------------------------------------------
// AI-powered deep fact check (1 credit)
// ---------------------------------------------------------------------------

export async function aiFactCheck(
  content: string,
  niche: string,
  settings: Record<string, string> = {},
): Promise<FactCheckResult> {
  // Start with heuristic checks
  const heuristic = heuristicFactCheck(content);

  // Build AI prompt
  const prompt = `You are a fact-checking editor for content in the "${niche}" niche.

Analyse the following content for factual accuracy. Check for:
1. Outdated information or statistics
2. Incorrect or misleading claims
3. Missing sources for bold claims
4. Logical inconsistencies
5. Common misconceptions presented as fact

Content to check:
---
${content.slice(0, 5000)}
---

Return ONLY valid JSON with this structure:
{
  "issues": [
    {
      "type": "error" | "warning" | "info",
      "category": "date" | "number" | "claim" | "outdated" | "url",
      "message": "description of the issue",
      "location": "the relevant text snippet"
    }
  ],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "confidence": 0-100
}`;

  try {
    const raw = await callAI(prompt, {
      system: 'You are a precise fact-checker. Return ONLY valid JSON.',
      maxTokens: 2000,
    }, settings);

    // Parse AI response
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
    }

    const aiResult = JSON.parse(cleaned) as {
      issues?: FactCheckIssue[];
      suggestions?: string[];
      confidence?: number;
    };

    // Merge heuristic and AI results
    const allIssues = [
      ...heuristic.issues,
      ...(aiResult.issues || []),
    ];

    // Deduplicate by message similarity
    const seen = new Set<string>();
    const deduped = allIssues.filter((issue) => {
      const key = issue.message.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const allSuggestions = [
      ...new Set([
        ...heuristic.suggestions,
        ...(aiResult.suggestions || []),
      ]),
    ];

    const errorCount = deduped.filter((i) => i.type === 'error').length;
    const warningCount = deduped.filter((i) => i.type === 'warning').length;
    const confidence = aiResult.confidence ?? heuristic.confidence;

    return {
      passed: errorCount === 0 && warningCount <= 2,
      confidence,
      issues: deduped,
      suggestions: allSuggestions,
    };
  } catch {
    // AI call failed -- return heuristic results only
    return heuristic;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractContext(content: string, index: number, radius: number = 60): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + radius);
  let context = content.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) context = '...' + context;
  if (end < content.length) context = context + '...';
  return context;
}
