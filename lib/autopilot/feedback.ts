/**
 * Performance Feedback Loop
 *
 * Collects signals from multiple sources and feeds them back
 * to the autopilot engine to improve future decisions.
 *
 * Sources:
 * - Google Search Console (real rankings, CTR, impressions)
 * - Content scores (SEO score, AI score, readability)
 * - User actions (approved/rejected from review queue)
 * - Engagement metrics (if available)
 *
 * This is the FLYWHEEL:
 * GSC data + content metrics -> feed into agents -> agents produce better content
 * -> better rankings -> more data -> smarter agents
 */

import type { ContentItem } from '@/types/content';
import type { GSCQuery } from '@/lib/gsc';
import type { AgentFeedbackEntry } from '@/types/agent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PerformanceSignal {
  contentId: string;
  slug: string;
  keyword: string;
  signals: {
    // GSC data (if connected)
    gscPosition?: number;
    gscClicks?: number;
    gscImpressions?: number;
    gscCTR?: number;
    positionChange?: number; // +5 means dropped 5 positions, -3 means improved 3

    // Content scores
    seoScore: number;
    aiScore: number;
    wordCount: number;

    // Age and freshness
    daysSincePublished: number;
    daysSinceUpdated: number;

    // User feedback
    wasEdited: boolean;
    wasRejected: boolean;
    editRatio: number; // 0-1, how much user changed vs agent output
  };
}

export interface FeedbackInsight {
  type: 'winning' | 'declining' | 'opportunity' | 'stale' | 'underperforming';
  contentId: string;
  slug: string;
  title: string;
  message: string;
  suggestedAction:
    | 'refresh'
    | 'expand'
    | 'rewrite-title'
    | 'add-sections'
    | 'update-meta'
    | 'add-images'
    | 'interlink'
    | 'nothing';
  priority: 'high' | 'medium' | 'low';
  data: Record<string, unknown>;
}

export interface QueueItem {
  id: string;
  type: 'feedback-action';
  contentId: string;
  slug: string;
  title: string;
  action: FeedbackInsight['suggestedAction'];
  insight: FeedbackInsight;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface AgentLearning {
  preferredTopics: string[];
  avoidedTopics: string[];
  preferredFormats: string[];
  avgApprovedWordCount: number;
  titleEditRate: number; // 0-1, how often user changes titles
  bodyEditRate: number; // 0-1, how often user edits body
  approvalRate: number; // 0-1
  totalApproved: number;
  totalRejected: number;
  insights: string[];
}

export interface FeedbackSummary {
  totalContent: number;
  winning: number;
  declining: number;
  opportunities: number;
  stale: number;
  avgPosition: number;
  avgCTR: number;
  topPerformers: string[];
  needsAttention: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STALE_THRESHOLD_DAYS = 90;
const POSITION_DROP_THRESHOLD = 5;
const LOW_CTR_THRESHOLD = 0.02; // 2%
const HIGH_CTR_THRESHOLD = 0.03; // 3%
const HIGH_IMPRESSION_THRESHOLD = 100;
const WINNING_POSITION_THRESHOLD = 10;
const LOW_SEO_SCORE_THRESHOLD = 50;
const LOW_AI_SCORE_THRESHOLD = 50;
const THIN_CONTENT_THRESHOLD = 600;

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Collect performance signals for all published content.
 * Merges content store data with GSC data when available.
 */
export function collectSignals(
  content: ContentItem[],
  gscData?: GSCQuery[],
): PerformanceSignal[] {
  const now = Date.now();
  const published = content.filter((c) => c.status === 'published');

  // Build a lookup from GSC query data keyed by keyword (lowercase)
  const gscLookup = new Map<string, GSCQuery>();
  if (gscData && gscData.length > 0) {
    for (const row of gscData) {
      gscLookup.set(row.query.toLowerCase(), row);
    }
  }

  return published.map((item) => {
    const keyword = (item.keyword || '').toLowerCase();
    const gsc = gscLookup.get(keyword);

    const publishTs = item.publishDate || item.created;
    const updateTs = item.updated || item.created;

    return {
      contentId: String(item.id),
      slug: item.slug || '',
      keyword: item.keyword || '',
      signals: {
        // GSC data
        gscPosition: gsc?.position,
        gscClicks: gsc?.clicks,
        gscImpressions: gsc?.impressions,
        gscCTR: gsc?.ctr,
        positionChange: undefined, // would need historical data to compute

        // Content scores
        seoScore: item.seoScore ?? 0,
        aiScore: item.aiScore ?? 0,
        wordCount: item.wordCount ?? 0,

        // Age
        daysSincePublished: Math.floor((now - publishTs) / 86400000),
        daysSinceUpdated: Math.floor((now - updateTs) / 86400000),

        // User feedback (defaults -- caller can enrich)
        wasEdited: false,
        wasRejected: false,
        editRatio: 0,
      },
    };
  });
}

/**
 * Analyze signals and generate insights.
 * Identifies winning, declining, opportunity, stale, and underperforming content.
 */
export function analyzePerformance(signals: PerformanceSignal[]): FeedbackInsight[] {
  const insights: FeedbackInsight[] = [];

  for (const signal of signals) {
    const s = signal.signals;
    const hasGSC = s.gscPosition !== undefined;

    // --- Winning content ---
    // Position < 10, CTR > 3%, recently updated
    if (
      hasGSC &&
      s.gscPosition !== undefined &&
      s.gscPosition < WINNING_POSITION_THRESHOLD &&
      s.gscCTR !== undefined &&
      s.gscCTR > HIGH_CTR_THRESHOLD &&
      s.daysSinceUpdated < STALE_THRESHOLD_DAYS
    ) {
      insights.push({
        type: 'winning',
        contentId: signal.contentId,
        slug: signal.slug,
        title: signal.keyword,
        message: `Ranking #${Math.round(s.gscPosition)} with ${(s.gscCTR * 100).toFixed(1)}% CTR. This content is performing well.`,
        suggestedAction: 'nothing',
        priority: 'low',
        data: {
          position: s.gscPosition,
          ctr: s.gscCTR,
          clicks: s.gscClicks,
          impressions: s.gscImpressions,
        },
      });
      continue; // no need to check other categories
    }

    // --- Declining content ---
    // Position dropped by 5+ (positionChange > 0 means drop)
    if (
      hasGSC &&
      s.positionChange !== undefined &&
      s.positionChange >= POSITION_DROP_THRESHOLD
    ) {
      insights.push({
        type: 'declining',
        contentId: signal.contentId,
        slug: signal.slug,
        title: signal.keyword,
        message: `Position dropped by ${s.positionChange} places. Content needs a refresh to recover rankings.`,
        suggestedAction: 'refresh',
        priority: 'high',
        data: {
          positionChange: s.positionChange,
          currentPosition: s.gscPosition,
          clicks: s.gscClicks,
        },
      });
      continue;
    }

    // --- CTR opportunity ---
    // High impressions but low CTR => title/meta not compelling
    if (
      hasGSC &&
      s.gscImpressions !== undefined &&
      s.gscImpressions > HIGH_IMPRESSION_THRESHOLD &&
      s.gscCTR !== undefined &&
      s.gscCTR < LOW_CTR_THRESHOLD
    ) {
      insights.push({
        type: 'opportunity',
        contentId: signal.contentId,
        slug: signal.slug,
        title: signal.keyword,
        message: `${s.gscImpressions} impressions but only ${(s.gscCTR * 100).toFixed(1)}% CTR. Title or meta description needs improvement.`,
        suggestedAction: 'rewrite-title',
        priority: 'high',
        data: {
          impressions: s.gscImpressions,
          ctr: s.gscCTR,
          position: s.gscPosition,
        },
      });
      continue;
    }

    // --- Stale content ---
    // Published 90+ days ago, not updated
    if (s.daysSinceUpdated >= STALE_THRESHOLD_DAYS) {
      insights.push({
        type: 'stale',
        contentId: signal.contentId,
        slug: signal.slug,
        title: signal.keyword,
        message: `Not updated in ${s.daysSinceUpdated} days. Search engines prefer fresh content.`,
        suggestedAction: 'refresh',
        priority: s.daysSinceUpdated > 180 ? 'high' : 'medium',
        data: {
          daysSinceUpdated: s.daysSinceUpdated,
          daysSincePublished: s.daysSincePublished,
        },
      });
      continue;
    }

    // --- Underperforming content ---
    // Low scores + low traffic (or no GSC data with poor scores)
    const isLowScore = s.seoScore < LOW_SEO_SCORE_THRESHOLD || s.aiScore < LOW_AI_SCORE_THRESHOLD;
    const isThin = s.wordCount < THIN_CONTENT_THRESHOLD;
    const isLowTraffic = hasGSC && s.gscClicks !== undefined && s.gscClicks < 5;
    const noGSCButPoorScores = !hasGSC && isLowScore;

    if ((isLowScore && isLowTraffic) || (isThin && isLowTraffic) || noGSCButPoorScores) {
      let action: FeedbackInsight['suggestedAction'] = 'refresh';
      if (isThin) action = 'expand';
      if (s.seoScore < 30) action = 'update-meta';

      insights.push({
        type: 'underperforming',
        contentId: signal.contentId,
        slug: signal.slug,
        title: signal.keyword,
        message: isThin
          ? `Only ${s.wordCount} words with SEO score ${s.seoScore}. Content needs expansion.`
          : `SEO score ${s.seoScore}, AI score ${s.aiScore}. Content quality needs improvement.`,
        suggestedAction: action,
        priority: isThin ? 'high' : 'medium',
        data: {
          seoScore: s.seoScore,
          aiScore: s.aiScore,
          wordCount: s.wordCount,
          clicks: s.gscClicks,
        },
      });
    }
  }

  // Sort: high priority first, then medium, then low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights;
}

/**
 * Generate action items from insights (these go into the review queue).
 */
export function generateActions(insights: FeedbackInsight[]): QueueItem[] {
  const now = Date.now();

  return insights
    .filter((insight) => insight.suggestedAction !== 'nothing')
    .map((insight, idx) => ({
      id: `feedback-${now}-${idx}`,
      type: 'feedback-action' as const,
      contentId: insight.contentId,
      slug: insight.slug,
      title: insight.title,
      action: insight.suggestedAction,
      insight,
      status: 'pending' as const,
      createdAt: now,
    }));
}

/**
 * Learn from user approvals/rejections -- adjust agent behavior.
 * Analyzes patterns in what users accept vs reject to improve future output.
 */
export function learnFromFeedback(
  approvedItems: QueueItem[],
  rejectedItems: QueueItem[],
  feedbackHistory?: AgentFeedbackEntry[],
): AgentLearning {
  const total = approvedItems.length + rejectedItems.length;
  const approvalRate = total > 0 ? approvedItems.length / total : 0;

  // Track which topics/keywords get approved
  const approvedKeywords = approvedItems
    .map((item) => item.title)
    .filter(Boolean);
  const rejectedKeywords = rejectedItems
    .map((item) => item.title)
    .filter(Boolean);

  // Analyze feedback history for edit patterns
  let titleEdits = 0;
  let bodyEdits = 0;
  let totalModified = 0;

  if (feedbackHistory) {
    for (const entry of feedbackHistory) {
      if (entry.action === 'modified') {
        totalModified++;
        const suggestion = entry.suggestion?.toLowerCase() || '';
        if (suggestion.includes('title') || suggestion.includes('meta')) {
          titleEdits++;
        } else {
          bodyEdits++;
        }
      }
    }
  }

  // Determine preferred formats based on approved content patterns
  const actionCounts: Record<string, number> = {};
  for (const item of approvedItems) {
    const action = item.action;
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  }
  const preferredFormats = Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([format]) => format);

  // Generate learning insights
  const insights: string[] = [];

  if (approvalRate > 0.8 && total >= 5) {
    insights.push('High approval rate -- agent suggestions are well-calibrated.');
  } else if (approvalRate < 0.4 && total >= 5) {
    insights.push('Low approval rate -- agents need to adjust their approach.');
  }

  if (titleEdits > bodyEdits && totalModified >= 3) {
    insights.push('Users frequently edit titles -- title generation needs improvement.');
  }

  if (rejectedKeywords.length >= 3) {
    insights.push(`Avoided topics pattern detected: ${rejectedKeywords.slice(0, 3).join(', ')}`);
  }

  if (approvedKeywords.length >= 3) {
    insights.push(`Preferred topics pattern: ${approvedKeywords.slice(0, 3).join(', ')}`);
  }

  return {
    preferredTopics: [...new Set(approvedKeywords)].slice(0, 10),
    avoidedTopics: [...new Set(rejectedKeywords)].slice(0, 10),
    preferredFormats,
    avgApprovedWordCount: 0, // would need word count data from content
    titleEditRate: totalModified > 0 ? titleEdits / totalModified : 0,
    bodyEditRate: totalModified > 0 ? bodyEdits / totalModified : 0,
    approvalRate,
    totalApproved: approvedItems.length,
    totalRejected: rejectedItems.length,
    insights,
  };
}

/**
 * Score a keyword's actual performance vs prediction.
 * Returns 0-100 accuracy score.
 */
export function scoreKeywordAccuracy(
  _keyword: string,
  predicted: { volume: string; difficulty: string },
  actual: { position: number; clicks: number },
): number {
  let score = 50; // base score

  // Volume accuracy: if we predicted high volume and got decent clicks, good
  const volumeMap: Record<string, number> = { high: 100, medium: 30, low: 5 };
  const expectedClicks = volumeMap[predicted.volume] ?? 30;
  const clickRatio = Math.min(actual.clicks / Math.max(expectedClicks, 1), 2);
  score += (clickRatio - 1) * 20; // +-20 based on click accuracy

  // Difficulty accuracy: if we predicted low difficulty and got good position, good
  const difficultyMap: Record<string, number> = { low: 15, medium: 30, high: 60 };
  const expectedPosition = difficultyMap[predicted.difficulty] ?? 30;
  if (actual.position < expectedPosition) {
    // Better than expected -- prediction was conservative, still good
    score += 15;
  } else if (actual.position > expectedPosition * 2) {
    // Much worse than expected -- prediction was off
    score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get the feedback summary for the dashboard.
 */
export function getFeedbackSummary(signals: PerformanceSignal[]): FeedbackSummary {
  const insights = analyzePerformance(signals);

  const winning = insights.filter((i) => i.type === 'winning').length;
  const declining = insights.filter((i) => i.type === 'declining').length;
  const opportunities = insights.filter((i) => i.type === 'opportunity').length;
  const stale = insights.filter((i) => i.type === 'stale').length;

  // Calculate averages from signals with GSC data
  const withPosition = signals.filter((s) => s.signals.gscPosition !== undefined);
  const withCTR = signals.filter((s) => s.signals.gscCTR !== undefined);

  const avgPosition =
    withPosition.length > 0
      ? withPosition.reduce((sum, s) => sum + (s.signals.gscPosition ?? 0), 0) / withPosition.length
      : 0;

  const avgCTR =
    withCTR.length > 0
      ? withCTR.reduce((sum, s) => sum + (s.signals.gscCTR ?? 0), 0) / withCTR.length
      : 0;

  // Top performers: highest clicks or best position
  const topPerformers = [...signals]
    .filter((s) => s.signals.gscClicks !== undefined && s.signals.gscClicks > 0)
    .sort((a, b) => (b.signals.gscClicks ?? 0) - (a.signals.gscClicks ?? 0))
    .slice(0, 5)
    .map((s) => s.slug);

  // If no GSC data, fall back to high SEO scores
  if (topPerformers.length === 0) {
    const byScore = [...signals]
      .sort((a, b) => b.signals.seoScore - a.signals.seoScore)
      .slice(0, 5)
      .map((s) => s.slug);
    topPerformers.push(...byScore);
  }

  // Needs attention: declining + stale + underperforming
  const needsAttention = insights
    .filter((i) => i.type !== 'winning' && i.suggestedAction !== 'nothing')
    .slice(0, 5)
    .map((i) => i.slug);

  return {
    totalContent: signals.length,
    winning,
    declining,
    opportunities,
    stale,
    avgPosition: Math.round(avgPosition * 10) / 10,
    avgCTR: Math.round(avgCTR * 10000) / 10000,
    topPerformers,
    needsAttention,
  };
}
