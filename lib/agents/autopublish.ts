/**
 * Auto-Publish System
 *
 * Content flows through quality gates automatically.
 * If ALL gates pass -> auto-publish to all configured platforms
 * If ANY gate fails -> hold for human review with explanation
 *
 * Human sets limits once:
 * - Max articles per day (e.g., 3)
 * - Max articles per week (e.g., 15)
 * - Minimum quality scores
 * - Which platforms to publish to
 * - Blackout hours (don't publish at 3am)
 *
 * All quality gates are HEURISTIC -- 0 AI credits.
 */

import type { ContentItem } from '@/types/content';
import { analyzeContent } from '@/lib/scoring/analyze';
import type { AutopilotEngineConfig } from '@/lib/autopilot/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PublishPlatform = 'conduit' | 'wordpress' | 'investingpro' | 'twitter' | 'linkedin' | 'rss';

export interface PublishLimits {
  maxPerDay: number;
  maxPerWeek: number;
  minSEOScore: number;
  minAIScore: number;
  minReadability: number;
  minWordCount: number;
  maxWordCount: number;
  requireFeaturedImage: boolean;
  requireMetaTitle: boolean;
  requireMetaDesc: boolean;
  requireMinHeadings: number;
  requireInternalLinks: number;
  publishHoursStart: number;
  publishHoursEnd: number;
  publishTimezone: string;
  enabledPlatforms: PublishPlatform[];
  autoPublishEnabled: boolean;
}

export interface GateResult {
  passed: boolean;
  message: string;
  value?: number;
  threshold?: number;
}

export interface QualityGateDefinition {
  name: string;
  check: (content: ContentItem, limits: PublishLimits, ctx: GateContext) => GateResult;
  severity: 'blocker' | 'warning';
}

export interface GateContext {
  publishedToday: number;
  publishedThisWeek: number;
  allContent: ContentItem[];
}

export interface PublishDecision {
  contentId: number;
  title: string;
  canAutoPublish: boolean;
  gateResults: { gate: string; result: GateResult; severity: 'blocker' | 'warning' }[];
  blockers: string[];
  warnings: string[];
  holdReason?: string;
  platforms: PublishPlatform[];
  scheduledTime?: number;
}

export interface PublishResult {
  platform: PublishPlatform;
  success: boolean;
  message: string;
  url?: string;
  timestamp: number;
}

export interface PublishLogEntry {
  contentId: number;
  title: string;
  timestamp: number;
  platforms: PublishPlatform[];
  results: PublishResult[];
  gateResults: { gate: string; passed: boolean; severity: 'blocker' | 'warning' }[];
  held: boolean;
  holdReason?: string;
}

// ---------------------------------------------------------------------------
// Default Limits (conservative)
// ---------------------------------------------------------------------------

export function getDefaultLimits(): PublishLimits {
  return {
    maxPerDay: 3,
    maxPerWeek: 15,
    minSEOScore: 70,
    minAIScore: 65,
    minReadability: 60,
    minWordCount: 800,
    maxWordCount: 5000,
    requireFeaturedImage: true,
    requireMetaTitle: true,
    requireMetaDesc: true,
    requireMinHeadings: 3,
    requireInternalLinks: 1,
    publishHoursStart: 6,
    publishHoursEnd: 22,
    publishTimezone: 'Asia/Kolkata',
    enabledPlatforms: ['conduit'],
    autoPublishEnabled: false,
  };
}

// ---------------------------------------------------------------------------
// Gate Implementations (all heuristic, 0 credits)
// ---------------------------------------------------------------------------

function seoScoreGate(content: ContentItem, limits: PublishLimits): GateResult {
  const score = content.seoScore || 0;
  return {
    passed: score >= limits.minSEOScore,
    message: score >= limits.minSEOScore
      ? `SEO score ${score} meets threshold`
      : `SEO score ${score} is below minimum ${limits.minSEOScore}`,
    value: score,
    threshold: limits.minSEOScore,
  };
}

function aiScoreGate(content: ContentItem, limits: PublishLimits): GateResult {
  const score = content.aiScore || 0;
  return {
    passed: score >= limits.minAIScore,
    message: score >= limits.minAIScore
      ? `AI quality score ${score} meets threshold`
      : `AI quality score ${score} is below minimum ${limits.minAIScore}`,
    value: score,
    threshold: limits.minAIScore,
  };
}

function readabilityGate(content: ContentItem, limits: PublishLimits): GateResult {
  const readability = content._readability;
  const ease = readability?.ease ?? 0;
  return {
    passed: ease >= limits.minReadability,
    message: ease >= limits.minReadability
      ? `Readability score ${ease} meets threshold`
      : `Readability score ${ease} is below minimum ${limits.minReadability}`,
    value: ease,
    threshold: limits.minReadability,
  };
}

function wordCountGate(content: ContentItem, limits: PublishLimits): GateResult {
  const wc = content.wordCount || 0;
  const tooShort = wc < limits.minWordCount;
  const tooLong = wc > limits.maxWordCount;
  return {
    passed: !tooShort && !tooLong,
    message: tooShort
      ? `Word count ${wc} is below minimum ${limits.minWordCount}`
      : tooLong
        ? `Word count ${wc} exceeds maximum ${limits.maxWordCount}`
        : `Word count ${wc} is within range`,
    value: wc,
    threshold: limits.minWordCount,
  };
}

function metaTitleGate(content: ContentItem, limits: PublishLimits): GateResult {
  if (!limits.requireMetaTitle) return { passed: true, message: 'Meta title check disabled' };
  const mt = content.metaTitle || content.seoTitle || '';
  const len = mt.length;
  const valid = len >= 30 && len <= 60;
  return {
    passed: valid,
    message: len === 0
      ? 'Meta title is missing'
      : valid
        ? `Meta title length ${len} is within range (30-60)`
        : `Meta title length ${len} is outside range (30-60)`,
    value: len,
    threshold: 30,
  };
}

function metaDescGate(content: ContentItem, limits: PublishLimits): GateResult {
  if (!limits.requireMetaDesc) return { passed: true, message: 'Meta description check disabled' };
  const md = content.metaDescription || content.metaDesc || '';
  const len = md.length;
  const valid = len >= 120 && len <= 160;
  return {
    passed: valid,
    message: len === 0
      ? 'Meta description is missing'
      : valid
        ? `Meta description length ${len} is within range (120-160)`
        : `Meta description length ${len} is outside range (120-160)`,
    value: len,
    threshold: 120,
  };
}

function headingGate(content: ContentItem, limits: PublishLimits): GateResult {
  const body = content.content || content.body || '';
  const h2Matches = body.match(/^##\s|<h2/gim) || [];
  const count = h2Matches.length;
  return {
    passed: count >= limits.requireMinHeadings,
    message: count >= limits.requireMinHeadings
      ? `Has ${count} H2 headings (minimum ${limits.requireMinHeadings})`
      : `Only ${count} H2 headings, need at least ${limits.requireMinHeadings}`,
    value: count,
    threshold: limits.requireMinHeadings,
  };
}

function keywordGate(content: ContentItem): GateResult {
  if (!content.keyword) {
    return { passed: false, message: 'No target keyword set' };
  }
  const kw = content.keyword.toLowerCase();
  const body = content.content || content.body || '';
  const title = (content.title || '').toLowerCase();
  const firstParagraph = body.split(/\n\n/)[0]?.toLowerCase() || '';
  const h2Text = (body.match(/^##\s.+/gm) || []).join(' ').toLowerCase();

  const inTitle = title.includes(kw);
  const inFirstPara = firstParagraph.includes(kw);
  const inH2 = h2Text.includes(kw);

  const issues: string[] = [];
  if (!inTitle) issues.push('title');
  if (!inFirstPara) issues.push('first paragraph');
  if (!inH2) issues.push('H2 headings');

  const passed = inTitle && inFirstPara && inH2;
  return {
    passed,
    message: passed
      ? `Keyword "${content.keyword}" found in title, first paragraph, and H2`
      : `Keyword "${content.keyword}" missing from: ${issues.join(', ')}`,
  };
}

function dailyLimitGate(_content: ContentItem, limits: PublishLimits, ctx: GateContext): GateResult {
  return {
    passed: ctx.publishedToday < limits.maxPerDay,
    message: ctx.publishedToday < limits.maxPerDay
      ? `Published ${ctx.publishedToday}/${limits.maxPerDay} today`
      : `Daily limit reached: ${ctx.publishedToday}/${limits.maxPerDay}`,
    value: ctx.publishedToday,
    threshold: limits.maxPerDay,
  };
}

function weeklyLimitGate(_content: ContentItem, limits: PublishLimits, ctx: GateContext): GateResult {
  return {
    passed: ctx.publishedThisWeek < limits.maxPerWeek,
    message: ctx.publishedThisWeek < limits.maxPerWeek
      ? `Published ${ctx.publishedThisWeek}/${limits.maxPerWeek} this week`
      : `Weekly limit reached: ${ctx.publishedThisWeek}/${limits.maxPerWeek}`,
    value: ctx.publishedThisWeek,
    threshold: limits.maxPerWeek,
  };
}

function publishHoursGate(_content: ContentItem, limits: PublishLimits): GateResult {
  const now = new Date();
  // Use a simple hour check -- timezone-aware formatting
  let currentHour: number;
  try {
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: limits.publishTimezone,
    });
    currentHour = parseInt(timeStr, 10);
  } catch {
    currentHour = now.getHours();
  }

  const inWindow = currentHour >= limits.publishHoursStart && currentHour < limits.publishHoursEnd;
  return {
    passed: inWindow,
    message: inWindow
      ? `Current hour ${currentHour} is within publish window (${limits.publishHoursStart}-${limits.publishHoursEnd})`
      : `Current hour ${currentHour} is outside publish window (${limits.publishHoursStart}-${limits.publishHoursEnd})`,
    value: currentHour,
  };
}

function duplicateGate(content: ContentItem, _limits: PublishLimits, ctx: GateContext): GateResult {
  const slug = content.slug || '';
  const title = (content.title || '').toLowerCase();

  for (const existing of ctx.allContent) {
    if (existing.id === content.id) continue;
    if (existing.status !== 'published') continue;

    // Exact slug match
    if (slug && existing.slug === slug) {
      return {
        passed: false,
        message: `Duplicate slug found: "${slug}" already exists`,
      };
    }

    // >80% similar title
    const existingTitle = (existing.title || '').toLowerCase();
    if (title && existingTitle) {
      const titleWords = new Set(title.split(/\s+/));
      const existingWords = new Set(existingTitle.split(/\s+/));
      const intersection = [...titleWords].filter((w) => existingWords.has(w));
      const similarity = intersection.length / Math.max(titleWords.size, existingWords.size);
      if (similarity > 0.8) {
        return {
          passed: false,
          message: `Title too similar to existing: "${existing.title}" (${Math.round(similarity * 100)}% match)`,
        };
      }
    }
  }

  return { passed: true, message: 'No duplicates found' };
}

function imageGate(content: ContentItem, limits: PublishLimits): GateResult {
  if (!limits.requireFeaturedImage) return { passed: true, message: 'Featured image check disabled' };
  const has = !!(content.featuredImage || content.ogImage);
  return {
    passed: has,
    message: has ? 'Featured image is set' : 'Featured image is missing',
  };
}

function internalLinksGate(content: ContentItem, limits: PublishLimits): GateResult {
  const body = content.content || content.body || '';
  const analysis = analyzeContent(body);
  const count = analysis.internalLinks;
  return {
    passed: count >= limits.requireInternalLinks,
    message: count >= limits.requireInternalLinks
      ? `Has ${count} internal links (minimum ${limits.requireInternalLinks})`
      : `Only ${count} internal links, need at least ${limits.requireInternalLinks}`,
    value: count,
    threshold: limits.requireInternalLinks,
  };
}

function freshnessGate(content: ContentItem): GateResult {
  const body = content.content || content.body || '';
  // Check for references to years more than 2 years old
  const currentYear = new Date().getFullYear();
  const yearMatches = body.match(/\b(20\d{2})\b/g) || [];
  const oldYears = yearMatches.filter((y) => parseInt(y, 10) < currentYear - 1);

  if (oldYears.length > 2) {
    return {
      passed: false,
      message: `Content references potentially outdated years: ${[...new Set(oldYears)].join(', ')}`,
    };
  }
  return { passed: true, message: 'Content appears fresh' };
}

// ---------------------------------------------------------------------------
// Quality Gates Registry
// ---------------------------------------------------------------------------

const QUALITY_GATES: QualityGateDefinition[] = [
  // BLOCKERS
  { name: 'SEO Score', check: (c, l) => seoScoreGate(c, l), severity: 'blocker' },
  { name: 'AI Quality Score', check: (c, l) => aiScoreGate(c, l), severity: 'blocker' },
  { name: 'Readability', check: (c, l) => readabilityGate(c, l), severity: 'blocker' },
  { name: 'Word Count', check: (c, l) => wordCountGate(c, l), severity: 'blocker' },
  { name: 'Meta Title', check: (c, l) => metaTitleGate(c, l), severity: 'blocker' },
  { name: 'Meta Description', check: (c, l) => metaDescGate(c, l), severity: 'blocker' },
  { name: 'Heading Structure', check: (c, l) => headingGate(c, l), severity: 'blocker' },
  { name: 'Keyword Present', check: (c) => keywordGate(c), severity: 'blocker' },
  { name: 'Daily Limit', check: (c, l, ctx) => dailyLimitGate(c, l, ctx), severity: 'blocker' },
  { name: 'Weekly Limit', check: (c, l, ctx) => weeklyLimitGate(c, l, ctx), severity: 'blocker' },
  { name: 'Publish Hours', check: (c, l) => publishHoursGate(c, l), severity: 'blocker' },
  { name: 'Duplicate Check', check: (c, l, ctx) => duplicateGate(c, l, ctx), severity: 'blocker' },

  // WARNINGS
  { name: 'Featured Image', check: (c, l) => imageGate(c, l), severity: 'warning' },
  { name: 'Internal Links', check: (c, l) => internalLinksGate(c, l), severity: 'warning' },
  { name: 'Content Freshness', check: (c) => freshnessGate(c), severity: 'warning' },
];

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Run all quality gates on a content item. Pure heuristic, 0 credits.
 */
export function runQualityGates(
  content: ContentItem,
  limits: PublishLimits,
  publishedToday: number,
  publishedThisWeek: number,
  allContent: ContentItem[],
): PublishDecision {
  const ctx: GateContext = { publishedToday, publishedThisWeek, allContent };
  const gateResults: PublishDecision['gateResults'] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const gate of QUALITY_GATES) {
    const result = gate.check(content, limits, ctx);
    gateResults.push({ gate: gate.name, result, severity: gate.severity });

    if (!result.passed) {
      if (gate.severity === 'blocker') {
        blockers.push(`${gate.name}: ${result.message}`);
      } else {
        warnings.push(`${gate.name}: ${result.message}`);
      }
    }
  }

  const canAutoPublish = blockers.length === 0 && limits.autoPublishEnabled;

  return {
    contentId: content.id,
    title: content.title,
    canAutoPublish,
    gateResults,
    blockers,
    warnings,
    holdReason: blockers.length > 0
      ? `Failed ${blockers.length} quality gate(s): ${blockers[0]}`
      : undefined,
    platforms: limits.enabledPlatforms,
    scheduledTime: canAutoPublish ? getOptimalPublishTime(limits.publishTimezone, new Date().getDay()) : undefined,
  };
}

/**
 * Auto-publish to all configured platforms.
 */
export async function autoPublish(
  content: ContentItem,
  platforms: PublishPlatform[],
  config: AutopilotEngineConfig | null,
  settings: Record<string, string> = {},
): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  for (const platform of platforms) {
    try {
      let result: PublishResult;
      switch (platform) {
        case 'conduit':
          result = publishToConduit(content);
          break;
        case 'wordpress':
          result = await publishToWordPress(content, settings.wpWebhookUrl || '');
          break;
        case 'investingpro':
          result = await publishToInvestingPro(content, settings.investingproWebhookUrl || '');
          break;
        case 'twitter':
          result = await publishToTwitter(content, settings);
          break;
        case 'linkedin':
          result = await publishToLinkedIn(content, settings);
          break;
        case 'rss':
          result = { platform: 'rss', success: true, message: 'Added to RSS feed', timestamp: Date.now() };
          break;
        default:
          result = { platform, success: false, message: `Unknown platform: ${platform}`, timestamp: Date.now() };
      }
      results.push(result);
    } catch (err) {
      results.push({
        platform,
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now(),
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Platform Publishers
// ---------------------------------------------------------------------------

function publishToConduit(content: ContentItem): PublishResult {
  // Conduit publishes by updating status in store -- handled by caller
  return {
    platform: 'conduit',
    success: true,
    message: `Published "${content.title}" to Conduit CMS`,
    timestamp: Date.now(),
  };
}

async function publishToWordPress(content: ContentItem, webhookUrl: string): Promise<PublishResult> {
  if (!webhookUrl) {
    return { platform: 'wordpress', success: false, message: 'WordPress webhook URL not configured', timestamp: Date.now() };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: content.title,
        slug: content.slug,
        content: content.content || content.body || '',
        status: 'publish',
        meta_title: content.metaTitle || content.seoTitle || '',
        meta_description: content.metaDescription || content.metaDesc || '',
        featured_image: content.featuredImage || '',
        keyword: content.keyword || '',
        tags: content.tags || [],
      }),
    });

    return {
      platform: 'wordpress',
      success: res.ok,
      message: res.ok ? 'Published to WordPress' : `WordPress webhook returned ${res.status}`,
      timestamp: Date.now(),
    };
  } catch (err) {
    return {
      platform: 'wordpress',
      success: false,
      message: err instanceof Error ? err.message : 'WordPress publish failed',
      timestamp: Date.now(),
    };
  }
}

async function publishToInvestingPro(content: ContentItem, webhookUrl: string): Promise<PublishResult> {
  if (!webhookUrl) {
    return { platform: 'investingpro', success: false, message: 'InvestingPro webhook URL not configured', timestamp: Date.now() };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'content.published',
        payload: {
          title: content.title,
          slug: content.slug,
          body: content.content || content.body || '',
          meta_title: content.metaTitle || content.seoTitle || '',
          meta_description: content.metaDescription || content.metaDesc || '',
          featured_image: content.featuredImage || '',
          keyword: content.keyword || '',
          tags: content.tags || [],
        },
      }),
    });

    return {
      platform: 'investingpro',
      success: res.ok,
      message: res.ok ? 'Published to InvestingPro' : `InvestingPro webhook returned ${res.status}`,
      timestamp: Date.now(),
    };
  } catch (err) {
    return {
      platform: 'investingpro',
      success: false,
      message: err instanceof Error ? err.message : 'InvestingPro publish failed',
      timestamp: Date.now(),
    };
  }
}

async function publishToTwitter(content: ContentItem, settings: Record<string, string>): Promise<PublishResult> {
  const title = content.title || '';
  const keyword = content.keyword || '';
  const slug = content.slug || '';
  const domain = settings.siteDomain || settings.domain || '';

  const tweetText = `${title}\n\n${keyword ? `#${keyword.replace(/\s+/g, '')} ` : ''}${domain ? `${domain}/${slug}` : ''}`.trim().slice(0, 280);

  try {
    const res = await fetch('/api/social/twitter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: tweetText }),
    });

    return {
      platform: 'twitter',
      success: res.ok,
      message: res.ok ? 'Posted to Twitter/X' : `Twitter post returned ${res.status}`,
      timestamp: Date.now(),
    };
  } catch (err) {
    return {
      platform: 'twitter',
      success: false,
      message: err instanceof Error ? err.message : 'Twitter post failed',
      timestamp: Date.now(),
    };
  }
}

async function publishToLinkedIn(content: ContentItem, settings: Record<string, string>): Promise<PublishResult> {
  const title = content.title || '';
  const excerpt = content.excerpt || '';
  const slug = content.slug || '';
  const domain = settings.siteDomain || settings.domain || '';

  const postText = `${title}\n\n${excerpt || `Check out our latest article on ${content.keyword || 'this topic'}.`}\n\n${domain ? `${domain}/${slug}` : ''}`.trim().slice(0, 3000);

  try {
    const res = await fetch('/api/social/linkedin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: postText }),
    });

    return {
      platform: 'linkedin',
      success: res.ok,
      message: res.ok ? 'Posted to LinkedIn' : `LinkedIn post returned ${res.status}`,
      timestamp: Date.now(),
    };
  } catch (err) {
    return {
      platform: 'linkedin',
      success: false,
      message: err instanceof Error ? err.message : 'LinkedIn post failed',
      timestamp: Date.now(),
    };
  }
}

// ---------------------------------------------------------------------------
// Timing Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate optimal publish time based on timezone and day of week.
 * Returns timestamp for the best publish slot.
 */
export function getOptimalPublishTime(timezone: string, dayOfWeek: number): number {
  // Optimal hours by day: weekdays morning (9-10am), weekends late morning (10-11am)
  const optimalHour = dayOfWeek === 0 || dayOfWeek === 6 ? 10 : 9;
  const optimalMinute = Math.floor(Math.random() * 30); // slight randomization

  const now = new Date();
  let targetHour: number;
  try {
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });
    const currentHour = parseInt(timeStr, 10);
    targetHour = currentHour < optimalHour ? optimalHour : optimalHour + 24;
  } catch {
    targetHour = optimalHour;
  }

  const diff = (targetHour - now.getHours()) * 3600000 + optimalMinute * 60000;
  return Date.now() + Math.max(0, diff);
}

/**
 * Get publish stats for content items.
 */
export function getPublishStats(content: ContentItem[]): {
  today: number;
  thisWeek: number;
  thisMonth: number;
  platforms: Record<string, number>;
} {
  const now = Date.now();
  const dayStart = now - 86400000;
  const weekStart = now - 7 * 86400000;
  const monthStart = now - 30 * 86400000;

  const published = content.filter((c) => c.status === 'published');

  return {
    today: published.filter((c) => (c.publishDate || c.updated) > dayStart).length,
    thisWeek: published.filter((c) => (c.publishDate || c.updated) > weekStart).length,
    thisMonth: published.filter((c) => (c.publishDate || c.updated) > monthStart).length,
    platforms: { conduit: published.length },
  };
}
