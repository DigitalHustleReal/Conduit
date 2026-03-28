/**
 * Revision Agent -- when user rejects a draft or gives feedback,
 * this agent revises SPECIFICALLY based on the feedback.
 * Not a rewrite -- a targeted revision addressing the user's concerns.
 */

import { callAI } from '@/lib/ai/call-ai';
import type { ContentItem } from '@/types/content';
import type { AutopilotEngineConfig } from '@/lib/autopilot/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevisionRequest {
  contentId: string;
  originalContent: ContentItem;
  userFeedback: string;
  rejectionReason?: string;
  specificSections?: string[];
}

export interface RevisionResult {
  revisedContent: ContentItem;
  changesExplained: string;
  changesSummary: { section: string; change: string }[];
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

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Revise content based on specific user feedback (1 credit)
// ---------------------------------------------------------------------------

export async function reviseContent(
  request: RevisionRequest,
  config: AutopilotEngineConfig,
  settings: Record<string, string>,
): Promise<RevisionResult> {
  const body = request.originalContent.content || request.originalContent.body || '';
  const sectionFocus = request.specificSections?.length
    ? `\nFocus your revisions on these sections: ${request.specificSections.join(', ')}`
    : '';

  const prompt = `You are an expert editor revising an article based on user feedback.

ORIGINAL ARTICLE:
Title: ${request.originalContent.title}
Keyword: ${request.originalContent.keyword || 'none'}
Niche: ${config.niche}

USER FEEDBACK: "${request.userFeedback}"
${request.rejectionReason ? `REJECTION REASON: "${request.rejectionReason}"` : ''}
${sectionFocus}

CURRENT BODY (first 5000 chars):
${body.slice(0, 5000)}

INSTRUCTIONS:
- Make TARGETED revisions based on the feedback -- do NOT rewrite from scratch
- Keep the overall structure intact unless feedback specifically asks to restructure
- Address every point in the user's feedback
- Preserve what works well
- Explain what you changed and why

Return JSON:
{
  "body": "the revised full article in markdown",
  "metaTitle": "revised meta title if needed, or original",
  "metaDescription": "revised meta description if needed, or original",
  "changesExplained": "Brief paragraph explaining all changes made",
  "changesSummary": [{"section": "Introduction", "change": "Shortened by 40%"}, ...]
}

Return ONLY valid JSON.`;

  const raw = await callAI(prompt, {
    system: 'You are an expert editor. Return only valid JSON. Make targeted revisions, not rewrites.',
    maxTokens: 4000,
  }, settings);

  const parsed = safeParseJSON<{
    body?: string;
    metaTitle?: string;
    metaDescription?: string;
    changesExplained?: string;
    changesSummary?: { section: string; change: string }[];
  }>(raw);

  const revisedBody = parsed?.body || body;
  const revisedContent: ContentItem = {
    ...request.originalContent,
    content: revisedBody,
    body: revisedBody,
    metaTitle: parsed?.metaTitle || request.originalContent.metaTitle,
    metaDescription: parsed?.metaDescription || request.originalContent.metaDescription,
    wordCount: countWords(revisedBody),
    updated: Date.now(),
  };

  return {
    revisedContent,
    changesExplained: parsed?.changesExplained || 'Revisions applied based on feedback.',
    changesSummary: parsed?.changesSummary || [{ section: 'General', change: 'Applied requested changes' }],
  };
}

// ---------------------------------------------------------------------------
// Quick revise -- apply a standard revision type without AI (0 credits)
// ---------------------------------------------------------------------------

export function quickRevise(
  content: ContentItem,
  type: 'shorten' | 'expand' | 'simplify' | 'formalize' | 'add-examples' | 'add-data',
): ContentItem {
  const body = content.content || content.body || '';
  let revised = body;

  switch (type) {
    case 'shorten': {
      // Remove filler sentences and shorten paragraphs
      const paragraphs = body.split(/\n\n+/);
      revised = paragraphs
        .map((p) => {
          const sentences = p.split(/(?<=[.!?])\s+/);
          if (sentences.length > 4) {
            // Keep first, remove filler-like sentences, keep last
            return sentences
              .filter((s) => {
                const lower = s.toLowerCase();
                // Remove common filler patterns
                const fillerPattern = new RegExp("^(in this section|as mentioned|it['\u2019]?s? (important|worth) (to note|noting)|let['\u2019]?s? (take a look|explore|dive))", "i");
                const isFiller = fillerPattern.test(lower);
                return !isFiller;
              })
              .join(' ');
          }
          return p;
        })
        .join('\n\n');
      break;
    }

    case 'simplify': {
      // Replace complex words with simpler alternatives
      const replacements: [RegExp, string][] = [
        [/\butilize\b/gi, 'use'],
        [/\bfacilitate\b/gi, 'help'],
        [/\bsubsequently\b/gi, 'then'],
        [/\bnevertheless\b/gi, 'but'],
        [/\bfurthermore\b/gi, 'also'],
        [/\bconsequently\b/gi, 'so'],
        [/\bdemonstrate\b/gi, 'show'],
        [/\bimplement\b/gi, 'set up'],
        [/\bnumerous\b/gi, 'many'],
        [/\bprior to\b/gi, 'before'],
        [/\bin order to\b/gi, 'to'],
        [/\bat this point in time\b/gi, 'now'],
        [/\bdue to the fact that\b/gi, 'because'],
      ];
      revised = body;
      for (const [pattern, replacement] of replacements) {
        revised = revised.replace(pattern, replacement);
      }
      break;
    }

    case 'formalize': {
      // Replace casual language with formal alternatives
      const replacements: [RegExp, string][] = [
        [/\bgonna\b/gi, 'going to'],
        [/\bwanna\b/gi, 'want to'],
        [/\bkinda\b/gi, 'somewhat'],
        [/\bpretty much\b/gi, 'essentially'],
        [/\bawesome\b/gi, 'excellent'],
        [/\bcool\b/gi, 'notable'],
        [/\ba lot of\b/gi, 'numerous'],
        [/\bget\b/gi, 'obtain'],
        [/\bbig\b/gi, 'significant'],
        [/\bthing\b/gi, 'element'],
      ];
      revised = body;
      for (const [pattern, replacement] of replacements) {
        revised = revised.replace(pattern, replacement);
      }
      break;
    }

    case 'expand':
    case 'add-examples':
    case 'add-data':
      // These need AI -- return as-is with a note
      revised = body;
      break;
  }

  return {
    ...content,
    content: revised,
    body: revised,
    wordCount: countWords(revised),
    updated: Date.now(),
  };
}
