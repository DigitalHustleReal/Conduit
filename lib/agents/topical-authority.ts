/**
 * Topical Authority -- the strategy that wins in 2026 SEO.
 *
 * Instead of random articles, build CLUSTERS of content around topics.
 * Pillar page (comprehensive guide) + 5-10 supporting articles,
 * all interlinked. This signals topical expertise to Google.
 */

import { callAI } from '@/lib/ai/call-ai';
import type { ContentItem, Keyword } from '@/types/content';
import type { ContentPlan } from '@/lib/autopilot/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopicCluster {
  id: string;
  topic: string;
  pillarKeyword: string;
  pillarContent?: ContentItem;
  supportingKeywords: string[];
  supportingContent: ContentItem[];
  completeness: number;
  internalLinks: number;
  missingTopics: string[];
  authority: 'building' | 'emerging' | 'established' | 'dominant';
}

export interface InterlinkSuggestion {
  fromId: number;
  fromTitle: string;
  toId: number;
  toTitle: string;
  anchorText: string;
  reason: string;
}

export interface ClusterContentPlan {
  title: string;
  keyword: string;
  role: 'pillar' | 'supporting';
  outline: string[];
  targetWordCount: number;
  contentType: 'article' | 'guide' | 'comparison' | 'listicle';
  priority: 'high' | 'medium' | 'low';
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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(extractWords(a));
  const wordsB = new Set(extractWords(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function countLinksTo(from: ContentItem, toSlug: string): number {
  const body = from.content || from.body || '';
  const pattern = new RegExp(`\\]\\(/?${toSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
  return (body.match(pattern) || []).length;
}

function countInternalLinks(body: string): number {
  const pattern = /\[([^\]]*)\]\((?!https?:\/\/)([^)]*)\)/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(body)) !== null) {
    if (m[2]) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// detectClusters  (0 credits -- heuristic)
// ---------------------------------------------------------------------------

export function detectClusters(
  content: ContentItem[],
  keywords: Keyword[],
): TopicCluster[] {
  const published = content.filter((c) => c.status === 'published' || c.status === 'draft');
  if (published.length === 0) return [];

  // Step 1: Group by collection first
  const collectionGroups = new Map<string, ContentItem[]>();
  for (const item of published) {
    const key = item.collection || 'general';
    const arr = collectionGroups.get(key) || [];
    arr.push(item);
    collectionGroups.set(key, arr);
  }

  // Step 2: Within each collection, further group by keyword similarity
  const clusters: TopicCluster[] = [];

  for (const [collectionName, items] of collectionGroups) {
    if (items.length === 0) continue;

    // Find sub-groups by keyword similarity
    const assigned = new Set<number>();
    const subGroups: ContentItem[][] = [];

    for (const item of items) {
      if (assigned.has(item.id)) continue;

      const group: ContentItem[] = [item];
      assigned.add(item.id);

      for (const other of items) {
        if (assigned.has(other.id)) continue;
        const titleSim = wordOverlap(item.title, other.title);
        const kwSim = item.keyword && other.keyword
          ? wordOverlap(item.keyword, other.keyword)
          : 0;
        if (titleSim >= 0.3 || kwSim >= 0.4) {
          group.push(other);
          assigned.add(other.id);
        }
      }

      subGroups.push(group);
    }

    // Step 3: For each sub-group, identify pillar and build cluster
    for (const group of subGroups) {
      if (group.length < 1) continue;

      // Pillar = longest/most comprehensive article
      const sorted = [...group].sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
      const pillar = sorted[0];
      const supporting = sorted.slice(1);

      // Get keywords from content
      const supportingKeywords = supporting
        .map((s) => s.keyword || '')
        .filter(Boolean);

      // Count internal links within cluster
      let clusterLinks = 0;
      for (const from of group) {
        for (const to of group) {
          if (from.id !== to.id && to.slug) {
            clusterLinks += countLinksTo(from, to.slug);
          }
        }
      }

      // Estimate completeness: we assume a good cluster needs ~6 supporting articles
      const estimatedNeeded = 6;
      const completeness = Math.min(100, Math.round((supporting.length / estimatedNeeded) * 100));

      // Determine missing topics (heuristic: look at keyword gaps)
      const coveredWords = new Set<string>();
      for (const item of group) {
        for (const w of extractWords(item.title)) coveredWords.add(w);
        if (item.keyword) {
          for (const w of extractWords(item.keyword)) coveredWords.add(w);
        }
      }
      const relatedKeywords = keywords.filter((k) => {
        const kw = k.keyword || k.term || '';
        return wordOverlap(kw, pillar.keyword || pillar.title) >= 0.25;
      });
      const missingTopics = relatedKeywords
        .filter((k) => {
          const kw = k.keyword || k.term || '';
          return !group.some((g) =>
            (g.keyword || '').toLowerCase() === kw.toLowerCase() ||
            wordOverlap(g.title, kw) >= 0.5
          );
        })
        .map((k) => k.keyword || k.term || '')
        .slice(0, 8);

      // Authority level
      let authority: TopicCluster['authority'] = 'building';
      if (completeness >= 80 && clusterLinks >= 5) authority = 'dominant';
      else if (completeness >= 60 && clusterLinks >= 3) authority = 'established';
      else if (completeness >= 30 || supporting.length >= 2) authority = 'emerging';

      const topic = collectionName !== 'general'
        ? collectionName
        : (pillar.keyword || pillar.title.split(/\s+/).slice(0, 3).join(' '));

      clusters.push({
        id: slugify(topic) + '-' + pillar.id,
        topic,
        pillarKeyword: pillar.keyword || pillar.title,
        pillarContent: pillar,
        supportingKeywords,
        supportingContent: supporting,
        completeness,
        internalLinks: clusterLinks,
        missingTopics,
        authority,
      });
    }
  }

  return clusters.sort((a, b) => b.supportingContent.length - a.supportingContent.length);
}

// ---------------------------------------------------------------------------
// suggestClusters  (1 credit -- AI)
// ---------------------------------------------------------------------------

export async function suggestClusters(
  niche: string,
  competitors: string[],
  existingClusters: TopicCluster[],
  settings: Record<string, string>,
): Promise<TopicCluster[]> {
  const existingTopics = existingClusters.map((c) => c.topic).join(', ') || 'none';

  const prompt = `Suggest 3-5 new topic clusters for a website in the "${niche}" niche.

Existing clusters: ${existingTopics}
Competitors: ${competitors.join(', ') || 'none specified'}

Each cluster should have:
- topic: the broad topic name
- pillarKeyword: the main keyword for the pillar page
- supportingKeywords: 5-8 supporting article keywords
- missingTopics: same as supportingKeywords for new clusters

Return ONLY a valid JSON array:
[{
  "topic": "...",
  "pillarKeyword": "...",
  "supportingKeywords": ["...", "..."],
  "missingTopics": ["...", "..."]
}]`;

  const raw = await callAI(prompt, {
    system: 'You are a topical authority SEO expert. Return ONLY valid JSON arrays.',
    maxTokens: 2000,
  }, settings);

  const parsed = safeParseJSON<Array<{
    topic: string;
    pillarKeyword: string;
    supportingKeywords: string[];
    missingTopics: string[];
  }>>(raw);

  if (!parsed || !Array.isArray(parsed)) return [];

  return parsed.map((c) => ({
    id: slugify(c.topic) + '-new',
    topic: c.topic,
    pillarKeyword: c.pillarKeyword,
    pillarContent: undefined,
    supportingKeywords: c.supportingKeywords || [],
    supportingContent: [],
    completeness: 0,
    internalLinks: 0,
    missingTopics: c.missingTopics || c.supportingKeywords || [],
    authority: 'building' as const,
  }));
}

// ---------------------------------------------------------------------------
// planClusterCompletion  (0 credits -- heuristic)
// ---------------------------------------------------------------------------

export function planClusterCompletion(cluster: TopicCluster): ContentPlan[] {
  const plans: ContentPlan[] = [];
  const today = new Date().toISOString().split('T')[0];

  // If no pillar content, plan it first
  if (!cluster.pillarContent) {
    plans.push({
      title: `Complete Guide to ${cluster.topic}`,
      keyword: cluster.pillarKeyword,
      outline: [
        `What is ${cluster.topic}?`,
        `Why ${cluster.topic} matters`,
        `How to get started with ${cluster.topic}`,
        `Best practices for ${cluster.topic}`,
        'Common mistakes to avoid',
        'Frequently asked questions',
      ],
      targetWordCount: 3000,
      contentType: 'guide',
      priority: 'high',
      scheduledDate: today,
    });
  }

  // Plan missing topics
  for (const topic of cluster.missingTopics.slice(0, 5)) {
    const isComparison = topic.toLowerCase().includes('vs') || topic.toLowerCase().includes('best');
    const isListicle = topic.toLowerCase().includes('top') || topic.toLowerCase().includes('best');

    plans.push({
      title: topic.charAt(0).toUpperCase() + topic.slice(1),
      keyword: topic,
      outline: [
        'Introduction',
        'Key points',
        'Detailed analysis',
        `How this relates to ${cluster.topic}`,
        'Conclusion',
      ],
      targetWordCount: 1500,
      contentType: isComparison ? 'comparison' : isListicle ? 'listicle' : 'article',
      priority: plans.length < 2 ? 'high' : 'medium',
      scheduledDate: today,
    });
  }

  return plans;
}

// ---------------------------------------------------------------------------
// generateClusterLinks  (0 credits -- heuristic)
// ---------------------------------------------------------------------------

export function generateClusterLinks(cluster: TopicCluster): InterlinkSuggestion[] {
  const suggestions: InterlinkSuggestion[] = [];
  const allContent = [
    ...(cluster.pillarContent ? [cluster.pillarContent] : []),
    ...cluster.supportingContent,
  ];

  if (allContent.length < 2) return [];

  const pillar = cluster.pillarContent;

  for (const article of cluster.supportingContent) {
    // Supporting -> Pillar link
    if (pillar) {
      const body = article.content || article.body || '';
      const alreadyLinked = pillar.slug ? countLinksTo(article, pillar.slug) > 0 : false;

      if (!alreadyLinked) {
        suggestions.push({
          fromId: article.id,
          fromTitle: article.title,
          toId: pillar.id,
          toTitle: pillar.title,
          anchorText: cluster.pillarKeyword,
          reason: 'Supporting article should link to pillar page',
        });
      }
    }

    // Pillar -> Supporting link
    if (pillar) {
      const pillarBody = pillar.content || pillar.body || '';
      const alreadyLinked = article.slug
        ? countLinksTo(pillar, article.slug) > 0
        : false;

      if (!alreadyLinked) {
        suggestions.push({
          fromId: pillar.id,
          fromTitle: pillar.title,
          toId: article.id,
          toTitle: article.title,
          anchorText: article.keyword || article.title,
          reason: 'Pillar page should link to all supporting articles',
        });
      }
    }

    // Supporting <-> Supporting links (between related articles)
    for (const other of cluster.supportingContent) {
      if (other.id === article.id) continue;
      const sim = wordOverlap(article.title, other.title);
      if (sim >= 0.2) {
        const body = article.content || article.body || '';
        const alreadyLinked = other.slug ? countLinksTo(article, other.slug) > 0 : false;
        if (!alreadyLinked) {
          suggestions.push({
            fromId: article.id,
            fromTitle: article.title,
            toId: other.id,
            toTitle: other.title,
            anchorText: other.keyword || other.title,
            reason: 'Related supporting articles should be interlinked',
          });
        }
      }
    }
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// scoreAuthority  (0 credits)
// ---------------------------------------------------------------------------

export function scoreAuthority(
  clusters: TopicCluster[],
): { score: number; level: string; nextMilestone: string } {
  if (clusters.length === 0) {
    return { score: 0, level: 'None', nextMilestone: 'Create your first topic cluster' };
  }

  const totalCompleteness = clusters.reduce((acc, c) => acc + c.completeness, 0);
  const avgCompleteness = totalCompleteness / clusters.length;

  const totalLinks = clusters.reduce((acc, c) => acc + c.internalLinks, 0);
  const totalArticles = clusters.reduce(
    (acc, c) => acc + c.supportingContent.length + (c.pillarContent ? 1 : 0),
    0,
  );

  // Score components
  let score = 0;

  // Cluster count (max 25)
  if (clusters.length >= 5) score += 25;
  else if (clusters.length >= 3) score += 15;
  else score += clusters.length * 5;

  // Average completeness (max 30)
  score += Math.round(avgCompleteness * 0.3);

  // Total interlinks (max 25)
  const linkScore = Math.min(25, Math.round((totalLinks / Math.max(1, totalArticles)) * 10));
  score += linkScore;

  // Established/dominant clusters (max 20)
  const strongClusters = clusters.filter(
    (c) => c.authority === 'established' || c.authority === 'dominant',
  ).length;
  score += Math.min(20, strongClusters * 7);

  score = Math.min(100, score);

  // Level
  let level: string;
  if (score >= 80) level = 'Dominant Authority';
  else if (score >= 60) level = 'Strong Authority';
  else if (score >= 40) level = 'Growing Authority';
  else if (score >= 20) level = 'Early Authority';
  else level = 'Getting Started';

  // Next milestone
  let nextMilestone: string;
  if (avgCompleteness < 50) {
    const incomplete = clusters.find((c) => c.completeness < 50);
    nextMilestone = incomplete
      ? `Complete the "${incomplete.topic}" cluster (${incomplete.missingTopics.length} articles needed)`
      : 'Add more supporting articles to your clusters';
  } else if (totalLinks < totalArticles) {
    nextMilestone = 'Add internal links between cluster articles';
  } else if (clusters.length < 3) {
    nextMilestone = 'Build more topic clusters to expand authority';
  } else if (strongClusters < clusters.length) {
    nextMilestone = 'Strengthen existing clusters to dominant level';
  } else {
    nextMilestone = 'Maintain and refresh existing content';
  }

  return { score, level, nextMilestone };
}
