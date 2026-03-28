/**
 * Content Brief -- generated BEFORE writing, not after.
 * Real teams never write without a brief. Our agents shouldn't either.
 *
 * Brief includes: keyword, angle, competitor analysis, target structure,
 * sources to reference, audience intent, brand voice notes, SEO requirements.
 *
 * Cost: 1 AI credit per brief.
 */

import { callAI } from '@/lib/ai/call-ai';
import type { ContentItem } from '@/types/content';
import type { AutopilotEngineConfig, ContentPlan } from '@/lib/autopilot/engine';
import type { AgentMemory } from '@/lib/agents/runtime';
import { getVoiceGuidance, type BrandVoiceProfile } from './voice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentBrief {
  keyword: string;
  title: string;
  angle: string;
  targetAudience: string;
  searchIntent: string;
  competitorAnalysis: string;
  requiredSections: string[];
  suggestedSources: string[];
  toneGuidance: string;
  seoRequirements: {
    targetWordCount: number;
    keywordDensity: string;
    requiredInTitle: boolean;
    requiredInH2: boolean;
    metaTitleGuidance: string;
    metaDescGuidance: string;
  };
  avoidList: string[];
  successPatterns: string[];
  estimatedCredits: number;
  createdAt: number;
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

// ---------------------------------------------------------------------------
// Generate a comprehensive brief from a content plan
// ---------------------------------------------------------------------------

export async function generateBrief(
  plan: ContentPlan,
  config: AutopilotEngineConfig,
  agentMemory: AgentMemory,
  existingContent: ContentItem[],
  settings: Record<string, string>,
  voiceProfile?: BrandVoiceProfile | null,
): Promise<ContentBrief> {
  // Gather context
  const existingTitles = existingContent
    .slice(0, 30)
    .map((c) => c.title)
    .join('\n');

  const avoidPatterns = agentMemory.avoidPatterns.slice(0, 10);
  const successPatterns = agentMemory.successPatterns.slice(0, 10);
  const userPrefs = Object.entries(agentMemory.userPreferences)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const voiceGuidanceStr = voiceProfile
    ? getVoiceGuidance(voiceProfile)
    : 'No brand voice profile yet. Write in a professional, accessible tone.';

  const prompt = `You are a senior content strategist creating a detailed content brief.

CONTEXT:
- Niche: ${config.niche}
- Target audience: ${config.targetAudience}
- Content goal: ${config.contentGoal}
- Language: ${config.language}
- Domain: ${config.domain || 'not set'}
- Competitors: ${config.competitors.length > 0 ? config.competitors.join(', ') : 'none specified'}

CONTENT PLAN:
- Title: ${plan.title}
- Keyword: ${plan.keyword}
- Content type: ${plan.contentType}
- Target word count: ${plan.targetWordCount}
- Planned outline: ${plan.outline.join(', ')}

EXISTING CONTENT (avoid overlap):
${existingTitles || 'No existing content yet'}

${voiceGuidanceStr}

${avoidPatterns.length > 0 ? `AVOID (learned from past rejections):\n${avoidPatterns.map((p) => `- ${p}`).join('\n')}` : ''}

${successPatterns.length > 0 ? `SUCCESS PATTERNS (what the user likes):\n${successPatterns.map((p) => `- ${p}`).join('\n')}` : ''}

${userPrefs ? `USER PREFERENCES: ${userPrefs}` : ''}

Create a comprehensive content brief. Return JSON:
{
  "angle": "unique perspective that differentiates this from competitors",
  "searchIntent": "what the searcher actually wants to learn/do/buy",
  "competitorAnalysis": "what competitors likely cover and what they miss",
  "requiredSections": ["H2 heading 1", "H2 heading 2", ...],
  "suggestedSources": ["type of source 1", "type of source 2", ...],
  "toneGuidance": "specific tone instructions for the writer",
  "seoRequirements": {
    "targetWordCount": number,
    "keywordDensity": "2-3% in first 200 words, 1-2% overall",
    "requiredInTitle": true,
    "requiredInH2": true,
    "metaTitleGuidance": "max 60 chars, start with keyword, include year if relevant",
    "metaDescGuidance": "120-155 chars, include keyword, add CTA"
  }
}

Return ONLY valid JSON, no markdown fences, no extra text.`;

  const raw = await callAI(prompt, {
    system: 'You are a content strategist. Return only valid JSON.',
    maxTokens: 1500,
  }, settings);

  const parsed = safeParseJSON<{
    angle?: string;
    searchIntent?: string;
    competitorAnalysis?: string;
    requiredSections?: string[];
    suggestedSources?: string[];
    toneGuidance?: string;
    seoRequirements?: {
      targetWordCount?: number;
      keywordDensity?: string;
      requiredInTitle?: boolean;
      requiredInH2?: boolean;
      metaTitleGuidance?: string;
      metaDescGuidance?: string;
    };
  }>(raw);

  return {
    keyword: plan.keyword,
    title: plan.title,
    angle: parsed?.angle || plan.outline[0] || 'Comprehensive coverage',
    targetAudience: config.targetAudience,
    searchIntent: parsed?.searchIntent || 'informational',
    competitorAnalysis: parsed?.competitorAnalysis || 'No competitor data available',
    requiredSections: parsed?.requiredSections || plan.outline,
    suggestedSources: parsed?.suggestedSources || ['Industry reports', 'Expert quotes', 'Case studies'],
    toneGuidance: parsed?.toneGuidance || voiceGuidanceStr,
    seoRequirements: {
      targetWordCount: parsed?.seoRequirements?.targetWordCount || plan.targetWordCount,
      keywordDensity: parsed?.seoRequirements?.keywordDensity || '2-3% in first 200 words, 1-2% overall',
      requiredInTitle: parsed?.seoRequirements?.requiredInTitle ?? true,
      requiredInH2: parsed?.seoRequirements?.requiredInH2 ?? true,
      metaTitleGuidance: parsed?.seoRequirements?.metaTitleGuidance || 'Max 60 chars, include keyword',
      metaDescGuidance: parsed?.seoRequirements?.metaDescGuidance || '120-155 chars, include keyword, add CTA',
    },
    avoidList: avoidPatterns,
    successPatterns,
    estimatedCredits: 1,
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Generate a quick heuristic brief (0 credits) -- when budget is tight
// ---------------------------------------------------------------------------

export function generateQuickBrief(
  plan: ContentPlan,
  config: AutopilotEngineConfig,
  agentMemory: AgentMemory,
  voiceProfile?: BrandVoiceProfile | null,
): ContentBrief {
  const voiceGuidanceStr = voiceProfile
    ? getVoiceGuidance(voiceProfile)
    : 'Write in a professional, accessible tone.';

  return {
    keyword: plan.keyword,
    title: plan.title,
    angle: `Comprehensive ${plan.contentType} covering ${plan.keyword}`,
    targetAudience: config.targetAudience,
    searchIntent: plan.contentType === 'comparison' ? 'commercial' : 'informational',
    competitorAnalysis: 'No AI analysis -- quick brief mode',
    requiredSections: plan.outline,
    suggestedSources: ['Industry data', 'Expert opinions', 'Real examples'],
    toneGuidance: voiceGuidanceStr,
    seoRequirements: {
      targetWordCount: plan.targetWordCount,
      keywordDensity: '2-3% in first 200 words, 1-2% overall',
      requiredInTitle: true,
      requiredInH2: true,
      metaTitleGuidance: `Max 60 chars. Include "${plan.keyword}".`,
      metaDescGuidance: `120-155 chars. Include "${plan.keyword}". End with CTA.`,
    },
    avoidList: agentMemory.avoidPatterns.slice(0, 10),
    successPatterns: agentMemory.successPatterns.slice(0, 10),
    estimatedCredits: 0,
    createdAt: Date.now(),
  };
}
