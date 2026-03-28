/**
 * Editor Agent -- reviews every draft before it reaches the user.
 * Checks: grammar, readability, brand voice, factual red flags,
 * SEO compliance, structure quality, and content completeness.
 *
 * Works in TWO modes:
 * - Heuristic review (0 credits): checks structure, word count, keyword density,
 *   heading hierarchy, meta length, readability score
 * - AI review (1 credit): checks tone, factual claims, content quality,
 *   brand voice compliance, suggestions for improvement
 */

import { callAI } from '@/lib/ai/call-ai';
import { analyzeContent } from '@/lib/scoring/analyze';
import { fleschKincaid } from '@/lib/scoring/readability';
import type { ContentItem } from '@/types/content';
import type { ContentBrief } from './brief';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditorialReview {
  contentId: string;
  reviewType: 'heuristic' | 'ai' | 'both';
  passedHeuristic: boolean;
  passedAI: boolean;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';

  heuristicChecks: {
    wordCount: { pass: boolean; value: number; target: number };
    keywordInTitle: { pass: boolean };
    keywordInFirstParagraph: { pass: boolean };
    keywordDensity: { pass: boolean; value: number; target: string };
    headingStructure: { pass: boolean; issues: string[] };
    metaTitleLength: { pass: boolean; length: number };
    metaDescLength: { pass: boolean; length: number };
    readabilityScore: { pass: boolean; score: number; grade: string };
    internalLinks: { pass: boolean; count: number };
    imageCount: { pass: boolean; count: number };
  };

  aiReview?: {
    toneConsistency: number;
    factualRedFlags: string[];
    brandVoiceMatch: number;
    contentCompleteness: number;
    suggestions: string[];
    strengths: string[];
  };

  blockers: string[];
  warnings: string[];
  autoFixes: EditorialFix[];
}

export interface EditorialFix {
  type: 'meta_title' | 'meta_description' | 'heading' | 'keyword_placement' | 'readability';
  description: string;
  original: string;
  suggested: string;
  autoApplicable: boolean;
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

function computeGrade(heuristic: boolean, aiPassed: boolean, blockerCount: number): EditorialReview['overallGrade'] {
  if (!heuristic && blockerCount > 2) return 'F';
  if (!heuristic) return 'D';
  if (!aiPassed && blockerCount > 0) return 'C';
  if (blockerCount === 0 && heuristic && aiPassed) return 'A';
  return 'B';
}

// ---------------------------------------------------------------------------
// Heuristic Review (0 credits)
// ---------------------------------------------------------------------------

export function heuristicReview(
  content: ContentItem,
  brief?: ContentBrief,
): EditorialReview {
  const body = content.content || content.body || '';
  const analysis = analyzeContent(body);
  const readability = fleschKincaid(body);
  const keyword = content.keyword || brief?.keyword || '';
  const kwLower = keyword.toLowerCase();

  const targetWC = brief?.seoRequirements?.targetWordCount || 1000;
  const metaTitle = content.metaTitle || content.seoTitle || '';
  const metaDesc = content.metaDescription || content.metaDesc || '';

  // Word count
  const wcPass = analysis.wordCount >= targetWC * 0.7;

  // Keyword in title
  const kwInTitle = keyword
    ? (content.title || '').toLowerCase().includes(kwLower)
    : true;

  // Keyword in first paragraph
  const firstPara = body.split(/\n\n/)[0] || '';
  const kwInFirstPara = keyword
    ? firstPara.toLowerCase().includes(kwLower)
    : true;

  // Keyword density
  let density = 0;
  if (keyword && analysis.wordCount > 0) {
    const count = body.toLowerCase().split(kwLower).length - 1;
    density = Math.round((count / analysis.wordCount) * 1000) / 10;
  }
  const densityPass = keyword ? (density >= 0.5 && density <= 3.0) : true;

  // Heading structure
  const headingIssues: string[] = [];
  if (analysis.h2Count === 0 && analysis.wordCount > 300) {
    headingIssues.push('No H2 headings found');
  }
  if (brief?.seoRequirements?.requiredInH2 && keyword) {
    const h2s = (body.match(/^##\s+(.+)$/gm) || []).join(' ').toLowerCase();
    if (!h2s.includes(kwLower)) {
      headingIssues.push('Keyword not found in any H2 heading');
    }
  }
  // Check for H1 inside body (should only be in title)
  if ((body.match(/^#\s+/gm) || []).length > 0) {
    headingIssues.push('H1 found in body (should only be the title)');
  }

  // Meta title
  const mtPass = metaTitle.length >= 30 && metaTitle.length <= 65;

  // Meta desc
  const mdPass = metaDesc.length >= 80 && metaDesc.length <= 165;

  // Readability
  const readPass = readability.ease >= 40;

  // Internal links
  const linksPass = analysis.internalLinks >= 1 || analysis.wordCount < 500;

  // Images
  const imgPass = analysis.imageCount >= 1 || analysis.wordCount < 500;

  // Determine blockers and warnings
  const blockers: string[] = [];
  const warnings: string[] = [];
  const autoFixes: EditorialFix[] = [];

  if (!wcPass) {
    if (analysis.wordCount < targetWC * 0.5) {
      blockers.push(`Word count (${analysis.wordCount}) is less than 50% of target (${targetWC})`);
    } else {
      warnings.push(`Word count (${analysis.wordCount}) is below target (${targetWC})`);
    }
  }

  if (!kwInTitle && keyword) {
    warnings.push('Target keyword not in title');
  }

  if (!kwInFirstPara && keyword) {
    warnings.push('Target keyword not in first paragraph');
  }

  if (!densityPass && keyword) {
    if (density > 3.0) {
      blockers.push(`Keyword density too high (${density}%) -- may be flagged as keyword stuffing`);
    } else if (density < 0.5) {
      warnings.push(`Keyword density too low (${density}%)`);
    }
  }

  if (headingIssues.length > 0) {
    for (const issue of headingIssues) {
      warnings.push(issue);
    }
  }

  if (!mtPass) {
    if (metaTitle.length === 0) {
      blockers.push('Meta title is missing');
      autoFixes.push({
        type: 'meta_title',
        description: 'Generate meta title from article title',
        original: '',
        suggested: (content.title || '').slice(0, 60),
        autoApplicable: true,
      });
    } else {
      warnings.push(`Meta title length (${metaTitle.length}) outside optimal range (30-65)`);
    }
  }

  if (!mdPass) {
    if (metaDesc.length === 0) {
      blockers.push('Meta description is missing');
      autoFixes.push({
        type: 'meta_description',
        description: 'Generate meta description from first paragraph',
        original: '',
        suggested: firstPara.replace(/[#*\[\]]/g, '').trim().slice(0, 155),
        autoApplicable: true,
      });
    } else {
      warnings.push(`Meta description length (${metaDesc.length}) outside optimal range (80-165)`);
    }
  }

  if (!readPass) {
    warnings.push(`Readability score is low (${readability.ease}/100, grade: ${readability.level})`);
  }

  if (!linksPass) {
    warnings.push('No internal links found');
  }

  if (!imgPass) {
    warnings.push('No images found');
  }

  const passedHeuristic = blockers.length === 0;

  return {
    contentId: String(content.id),
    reviewType: 'heuristic',
    passedHeuristic,
    passedAI: false,
    overallGrade: computeGrade(passedHeuristic, false, blockers.length),
    heuristicChecks: {
      wordCount: { pass: wcPass, value: analysis.wordCount, target: targetWC },
      keywordInTitle: { pass: kwInTitle },
      keywordInFirstParagraph: { pass: kwInFirstPara },
      keywordDensity: { pass: densityPass, value: density, target: '0.5-3.0%' },
      headingStructure: { pass: headingIssues.length === 0, issues: headingIssues },
      metaTitleLength: { pass: mtPass, length: metaTitle.length },
      metaDescLength: { pass: mdPass, length: metaDesc.length },
      readabilityScore: { pass: readPass, score: readability.ease, grade: readability.level },
      internalLinks: { pass: linksPass, count: analysis.internalLinks },
      imageCount: { pass: imgPass, count: analysis.imageCount },
    },
    blockers,
    warnings,
    autoFixes,
  };
}

// ---------------------------------------------------------------------------
// AI Review (1 credit) -- only when heuristic passes
// ---------------------------------------------------------------------------

export async function aiReview(
  content: ContentItem,
  brief: ContentBrief | undefined,
  brandVoiceSamples: string[],
  settings: Record<string, string>,
): Promise<EditorialReview> {
  // Run heuristic first
  const hResult = heuristicReview(content, brief);

  const body = content.content || content.body || '';
  const briefContext = brief
    ? `\nBRIEF:\n- Angle: ${brief.angle}\n- Search intent: ${brief.searchIntent}\n- Required sections: ${brief.requiredSections.join(', ')}\n- Tone: ${brief.toneGuidance}`
    : '';

  const voiceContext = brandVoiceSamples.length > 0
    ? `\nBRAND VOICE SAMPLES (first 200 chars each):\n${brandVoiceSamples.slice(0, 3).map((s, i) => `Sample ${i + 1}: ${s.slice(0, 200)}`).join('\n')}`
    : '';

  const prompt = `Review this content draft as an expert editor.

TITLE: ${content.title}
KEYWORD: ${content.keyword || 'none'}
${briefContext}
${voiceContext}

DRAFT (first 4000 chars):
${body.slice(0, 4000)}

Evaluate:
1. toneConsistency (0-100): Does the tone stay consistent throughout?
2. factualRedFlags: List any claims that need verification (stats, dates, specific claims)
3. brandVoiceMatch (0-100): How well does this match the brand voice samples? (50 if no samples)
4. contentCompleteness (0-100): Does it fully cover the topic? ${brief ? `Required sections: ${brief.requiredSections.join(', ')}` : ''}
5. suggestions: 3-5 specific improvements (not generic)
6. strengths: 2-3 things done well

Also check for AI-sounding patterns:
- Overuse of "delve into", "in today's world", "it's important to note"
- Generic filler sentences that add no value
- Unnaturally perfect structure without personality

Return JSON:
{
  "toneConsistency": number,
  "factualRedFlags": ["claim that needs verification"],
  "brandVoiceMatch": number,
  "contentCompleteness": number,
  "suggestions": ["specific improvement"],
  "strengths": ["what's good"]
}

Return ONLY valid JSON.`;

  const raw = await callAI(prompt, {
    system: 'You are a senior editor. Return only valid JSON.',
    maxTokens: 1200,
  }, settings);

  const parsed = safeParseJSON<{
    toneConsistency?: number;
    factualRedFlags?: string[];
    brandVoiceMatch?: number;
    contentCompleteness?: number;
    suggestions?: string[];
    strengths?: string[];
  }>(raw);

  const aiResult = {
    toneConsistency: parsed?.toneConsistency ?? 50,
    factualRedFlags: parsed?.factualRedFlags ?? [],
    brandVoiceMatch: parsed?.brandVoiceMatch ?? 50,
    contentCompleteness: parsed?.contentCompleteness ?? 50,
    suggestions: parsed?.suggestions ?? [],
    strengths: parsed?.strengths ?? [],
  };

  // AI review passes if all scores are above 50
  const passedAI = aiResult.toneConsistency >= 50
    && aiResult.brandVoiceMatch >= 40
    && aiResult.contentCompleteness >= 50;

  // Add AI-specific blockers/warnings
  const blockers = [...hResult.blockers];
  const warnings = [...hResult.warnings];

  if (aiResult.factualRedFlags.length > 0) {
    for (const flag of aiResult.factualRedFlags) {
      warnings.push(`Verify claim: ${flag}`);
    }
  }

  if (aiResult.toneConsistency < 40) {
    blockers.push(`Tone inconsistency detected (score: ${aiResult.toneConsistency}/100)`);
  }

  if (aiResult.contentCompleteness < 40) {
    blockers.push(`Content appears incomplete (score: ${aiResult.contentCompleteness}/100)`);
  }

  return {
    ...hResult,
    reviewType: 'both',
    passedAI,
    overallGrade: computeGrade(hResult.passedHeuristic, passedAI, blockers.length),
    aiReview: aiResult,
    blockers,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Full Review (heuristic first, AI only if heuristic passes)
// ---------------------------------------------------------------------------

export async function fullReview(
  content: ContentItem,
  brief: ContentBrief | undefined,
  brandVoiceSamples: string[],
  settings: Record<string, string>,
): Promise<EditorialReview> {
  const hResult = heuristicReview(content, brief);

  // Only run AI review if heuristic passes (saves credits on bad drafts)
  if (!hResult.passedHeuristic) {
    return hResult;
  }

  return aiReview(content, brief, brandVoiceSamples, settings);
}

// ---------------------------------------------------------------------------
// Apply auto-fixes from editorial review
// ---------------------------------------------------------------------------

export function applyEditorialFixes(
  content: ContentItem,
  fixes: EditorialFix[],
): ContentItem {
  let updated = { ...content };

  for (const fix of fixes) {
    if (!fix.autoApplicable) continue;

    switch (fix.type) {
      case 'meta_title':
        updated = { ...updated, metaTitle: fix.suggested };
        break;
      case 'meta_description':
        updated = { ...updated, metaDescription: fix.suggested };
        break;
      case 'heading':
      case 'keyword_placement':
      case 'readability': {
        // Replace in body
        const body = updated.content || updated.body || '';
        if (fix.original && body.includes(fix.original)) {
          const newBody = body.replace(fix.original, fix.suggested);
          updated = { ...updated, content: newBody, body: newBody };
        }
        break;
      }
    }
  }

  updated.updated = Date.now();
  return updated;
}
