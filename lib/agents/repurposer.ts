/**
 * Content Repurposer -- transforms one article into multiple formats.
 *
 * Article -> Twitter thread + LinkedIn post + Instagram carousel script +
 *            YouTube script + Email newsletter + Reddit post +
 *            Quora answer + Pinterest pin description + Short-form video script +
 *            Infographic outline + Podcast talking points + SlideShare outline
 *
 * batchRepurpose uses ONE AI call for ALL formats (1-2 credits total).
 */

import type { ContentItem } from '@/types/content';
import type { BrandVoiceProfile } from '@/lib/agents/voice';
import { getVoiceGuidance } from '@/lib/agents/voice';
import { callAI } from '@/lib/ai/call-ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RepurposeFormat =
  | 'twitter-thread'
  | 'twitter-single'
  | 'linkedin-post'
  | 'linkedin-carousel'
  | 'instagram-caption'
  | 'instagram-carousel'
  | 'youtube-script'
  | 'youtube-shorts'
  | 'email-newsletter'
  | 'reddit-post'
  | 'quora-answer'
  | 'pinterest-pin'
  | 'podcast-outline'
  | 'infographic-outline'
  | 'slide-deck'
  | 'whatsapp-forward'
  | 'medium-crosspost';

export interface RepurposedContent {
  format: RepurposeFormat;
  title: string;
  content: string;
  hashtags?: string[];
  characterCount: number;
  platform: string;
  scheduledTime?: number;
  status: 'draft' | 'queued' | 'posted';
  metadata: Record<string, unknown>;
}

export interface RepurposeConfig {
  enabledFormats: RepurposeFormat[];
  autoQueue: boolean;
  brandVoice: BrandVoiceProfile | null;
  customHashtags: string[];
  customCTAs: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Platform Constraints
// ---------------------------------------------------------------------------

export const PLATFORM_LIMITS: Record<
  string,
  { maxChars: number; maxHashtags: number; bestTime: string }
> = {
  'twitter-thread': { maxChars: 280, maxHashtags: 3, bestTime: '9am-12pm' },
  'twitter-single': { maxChars: 280, maxHashtags: 3, bestTime: '9am-12pm' },
  'linkedin-post': { maxChars: 3000, maxHashtags: 5, bestTime: '8am-10am Tue-Thu' },
  'linkedin-carousel': { maxChars: 300, maxHashtags: 5, bestTime: '8am-10am Tue-Thu' },
  'instagram-caption': { maxChars: 2200, maxHashtags: 30, bestTime: '11am-1pm' },
  'instagram-carousel': { maxChars: 300, maxHashtags: 30, bestTime: '11am-1pm' },
  'youtube-script': { maxChars: 50000, maxHashtags: 15, bestTime: 'Sat-Sun' },
  'youtube-shorts': { maxChars: 5000, maxHashtags: 5, bestTime: 'Evening' },
  'email-newsletter': { maxChars: 10000, maxHashtags: 0, bestTime: 'Tue-Thu 10am' },
  'reddit-post': { maxChars: 40000, maxHashtags: 0, bestTime: '6am-8am EST' },
  'quora-answer': { maxChars: 10000, maxHashtags: 0, bestTime: 'any' },
  'pinterest-pin': { maxChars: 500, maxHashtags: 20, bestTime: '8pm-11pm' },
  'podcast-outline': { maxChars: 10000, maxHashtags: 0, bestTime: 'any' },
  'infographic-outline': { maxChars: 5000, maxHashtags: 0, bestTime: 'any' },
  'slide-deck': { maxChars: 10000, maxHashtags: 0, bestTime: 'any' },
  'whatsapp-forward': { maxChars: 1000, maxHashtags: 0, bestTime: 'any' },
  'medium-crosspost': { maxChars: 50000, maxHashtags: 5, bestTime: 'Tue-Thu morning' },
};

export const FORMAT_LABELS: Record<RepurposeFormat, string> = {
  'twitter-thread': 'Twitter Thread',
  'twitter-single': 'Tweet',
  'linkedin-post': 'LinkedIn Post',
  'linkedin-carousel': 'LinkedIn Carousel',
  'instagram-caption': 'Instagram Caption',
  'instagram-carousel': 'Instagram Carousel',
  'youtube-script': 'YouTube Script',
  'youtube-shorts': 'YouTube Shorts',
  'email-newsletter': 'Email Newsletter',
  'reddit-post': 'Reddit Post',
  'quora-answer': 'Quora Answer',
  'pinterest-pin': 'Pinterest Pin',
  'podcast-outline': 'Podcast Outline',
  'infographic-outline': 'Infographic Outline',
  'slide-deck': 'Slide Deck',
  'whatsapp-forward': 'WhatsApp Forward',
  'medium-crosspost': 'Medium Crosspost',
};

export const FORMAT_PLATFORMS: Record<RepurposeFormat, string> = {
  'twitter-thread': 'Twitter / X',
  'twitter-single': 'Twitter / X',
  'linkedin-post': 'LinkedIn',
  'linkedin-carousel': 'LinkedIn',
  'instagram-caption': 'Instagram',
  'instagram-carousel': 'Instagram',
  'youtube-script': 'YouTube',
  'youtube-shorts': 'YouTube',
  'email-newsletter': 'Email',
  'reddit-post': 'Reddit',
  'quora-answer': 'Quora',
  'pinterest-pin': 'Pinterest',
  'podcast-outline': 'Podcast',
  'infographic-outline': 'Infographic',
  'slide-deck': 'SlideShare',
  'whatsapp-forward': 'WhatsApp',
  'medium-crosspost': 'Medium',
};

export const FORMAT_ICONS: Record<RepurposeFormat, string> = {
  'twitter-thread': '\uD83D\uDC26',
  'twitter-single': '\uD83D\uDC26',
  'linkedin-post': '\uD83D\uDCBC',
  'linkedin-carousel': '\uD83D\uDCBC',
  'instagram-caption': '\uD83D\uDCF7',
  'instagram-carousel': '\uD83D\uDCF7',
  'youtube-script': '\uD83C\uDFAC',
  'youtube-shorts': '\uD83C\uDFAC',
  'email-newsletter': '\uD83D\uDCE7',
  'reddit-post': '\uD83E\uDD16',
  'quora-answer': '\u2753',
  'pinterest-pin': '\uD83D\uDCCC',
  'podcast-outline': '\uD83C\uDFA7',
  'infographic-outline': '\uD83D\uDCC8',
  'slide-deck': '\uD83D\uDCCA',
  'whatsapp-forward': '\uD83D\uDCAC',
  'medium-crosspost': '\u270D\uFE0F',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractKeyPoints(body: string): string[] {
  const points: string[] = [];
  const headings = body.match(/^#{2,3}\s+(.+)$/gm) || [];
  for (const h of headings.slice(0, 8)) {
    points.push(h.replace(/^#{2,3}\s+/, '').trim());
  }
  if (points.length === 0) {
    const sentences = body.split(/[.!?]+/).filter((s) => s.trim().length > 30);
    for (const s of sentences.slice(0, 5)) {
      points.push(s.trim());
    }
  }
  return points;
}

function buildPrompt(
  article: ContentItem,
  formats: RepurposeFormat[],
  config: RepurposeConfig,
): string {
  const body = article.content || article.body || '';
  const keyPoints = extractKeyPoints(body);
  const voiceGuidance = config.brandVoice
    ? getVoiceGuidance(config.brandVoice)
    : 'Use a professional, engaging tone.';

  const formatInstructions = formats
    .map((f) => {
      const limit = PLATFORM_LIMITS[f];
      const cta = config.customCTAs[f] || '';
      return `- ${f}: max ${limit.maxChars} chars, ${limit.maxHashtags} hashtags max${cta ? `, CTA: "${cta}"` : ''}`;
    })
    .join('\n');

  const hashtagNote =
    config.customHashtags.length > 0
      ? `Always include these hashtags where relevant: ${config.customHashtags.join(', ')}`
      : '';

  return `Take this article and create content for these platforms in ONE response.
Return ONLY a valid JSON array with one object per format. No markdown fences.

Article title: ${article.title}
Article content (first 2000 chars):
${body.slice(0, 2000)}

Key points: ${keyPoints.join(' | ')}
Target keyword: ${article.keyword || 'general topic'}
${hashtagNote}

${voiceGuidance}

Generate for these formats:
${formatInstructions}

For each format, return an object with these fields:
{
  "format": "<format-id>",
  "title": "<a short title for this piece>",
  "content": "<the actual repurposed text>",
  "hashtags": ["tag1", "tag2"]
}

Rules for each platform:
- Twitter thread: 5-10 tweets separated by "---". Hook-driven opening, numbered tips, end with CTA
- Twitter single: One punchy tweet with link placeholder [LINK]
- LinkedIn post: Professional, insight-driven, use line breaks, end with question for engagement
- LinkedIn carousel: 8-10 slides, each slide text on its own line prefixed with "SLIDE N:"
- Instagram caption: Storytelling, emoji-rich, line breaks, hashtags at end
- Instagram carousel: 10 slides, educational, each prefixed "SLIDE N:"
- YouTube script: Spoken language, [INTRO], [MAIN], [OUTRO] sections, engaging hooks
- YouTube shorts: 60-second script, fast-paced, hook in first 3 seconds
- Email newsletter: Subject line first, then scannable body with clear CTA
- Reddit post: Authentic, value-first, no self-promotion feel, conversational
- Quora answer: Authoritative, well-structured, references to data
- Pinterest pin: Catchy title + compelling description + keywords
- Podcast outline: Talking points, discussion questions, key takeaways
- Infographic outline: Data points, section headers, visual hierarchy notes
- Slide deck: Slide-by-slide outline with key points per slide
- WhatsApp forward: Short, shareable, conversational, emoji-friendly
- Medium crosspost: Adapted intro, pull quotes, Medium-style formatting

Make each version feel NATIVE to its platform, not copy-pasted.
Respect character limits strictly.`;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Batch repurpose -- generate ALL formats in ONE AI call (1-2 credits).
 */
export async function batchRepurpose(
  article: ContentItem,
  formats: RepurposeFormat[],
  config: RepurposeConfig,
  settings: Record<string, string>,
): Promise<RepurposedContent[]> {
  if (formats.length === 0) return [];

  const prompt = buildPrompt(article, formats, config);

  const raw = await callAI(prompt, {
    system:
      'You are a social media content expert. You transform articles into platform-native content. Return ONLY valid JSON, no markdown fences or commentary.',
    maxTokens: 4096,
  }, settings);

  // Parse the JSON response
  let parsed: Array<{
    format: string;
    title: string;
    content: string;
    hashtags?: string[];
  }>;

  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json?\s*/gi, '').replace(/```\s*$/gi, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON array from the response
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.warn('[repurposer] Failed to parse AI response');
        return [];
      }
    } else {
      console.warn('[repurposer] No JSON array found in AI response');
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.map((item) => ({
    format: item.format as RepurposeFormat,
    title: item.title || FORMAT_LABELS[item.format as RepurposeFormat] || item.format,
    content: item.content || '',
    hashtags: [
      ...(item.hashtags || []),
      ...config.customHashtags,
    ].slice(0, PLATFORM_LIMITS[item.format]?.maxHashtags || 5),
    characterCount: (item.content || '').length,
    platform: FORMAT_PLATFORMS[item.format as RepurposeFormat] || item.format,
    status: config.autoQueue ? 'queued' as const : 'draft' as const,
    metadata: {
      articleId: article.id,
      articleTitle: article.title,
      generatedAt: Date.now(),
    },
  }));
}

/**
 * Repurpose one article into all enabled formats.
 * Delegates to batchRepurpose for credit efficiency.
 */
export async function repurposeArticle(
  article: ContentItem,
  config: RepurposeConfig,
  settings: Record<string, string>,
): Promise<RepurposedContent[]> {
  return batchRepurpose(article, config.enabledFormats, config, settings);
}

/**
 * Get default enabled formats (the most common ones).
 */
export function getDefaultFormats(): RepurposeFormat[] {
  return [
    'twitter-thread',
    'twitter-single',
    'linkedin-post',
    'instagram-caption',
    'email-newsletter',
    'reddit-post',
  ];
}

/**
 * Get default repurpose config.
 */
export function getDefaultRepurposeConfig(): RepurposeConfig {
  return {
    enabledFormats: getDefaultFormats(),
    autoQueue: false,
    brandVoice: null,
    customHashtags: [],
    customCTAs: {},
  };
}

/**
 * All available formats as an array for UI iteration.
 */
export const ALL_FORMATS: RepurposeFormat[] = [
  'twitter-thread',
  'twitter-single',
  'linkedin-post',
  'linkedin-carousel',
  'instagram-caption',
  'instagram-carousel',
  'youtube-script',
  'youtube-shorts',
  'email-newsletter',
  'reddit-post',
  'quora-answer',
  'pinterest-pin',
  'podcast-outline',
  'infographic-outline',
  'slide-deck',
  'whatsapp-forward',
  'medium-crosspost',
];
