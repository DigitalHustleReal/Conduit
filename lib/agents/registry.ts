/**
 * Agent Registry -- 8 core autonomous agents with specific roles, goals,
 * and heuristic-first reasoning (AI only when needed).
 */

import type { QueueItemType } from '@/lib/autopilot/queue';
import {
  ConduitAgent,
  agentAICall,
  createEmptyMemory,
  type AgentGoal,
  type AgentMemory,
  type AgentPerception,
  type AgentReasonFn,
  type AgentActFn,
  type AgentRunResult,
  type AgentWorkspaceView,
} from './runtime';

// ---------------------------------------------------------------------------
// Reason + Act functions for each agent (heuristic-first, credit-efficient)
// ---------------------------------------------------------------------------

// 1. SEO Guardian ----------------------------------------------------------

const seoGuardianReason: AgentReasonFn = async (perception, memory) => {
  // Heuristic: If there are low-SEO content items, fix them
  if (perception.lowSEOContent.length > 0) {
    const worst = perception.lowSEOContent.sort((a, b) => a.seoScore - b.seoScore)[0];
    // Check if we recently suggested this same item
    const recentlyActedOn = memory.recentDecisions.some(
      (d) => d.action.includes(worst.slug) && d.timestamp > Date.now() - 24 * 60 * 60 * 1000,
    );
    if (recentlyActedOn) {
      return { shouldAct: false, action: 'wait', reasoning: `Already suggested fix for "${worst.slug}" recently. Waiting.`, confidence: 0.9 };
    }
    return {
      shouldAct: true,
      action: `fix_seo:${worst.id}`,
      reasoning: `Content "${worst.slug}" has SEO score ${worst.seoScore}/100 (below threshold of 50). Suggesting meta improvements.`,
      confidence: 0.85,
    };
  }

  // If avg SEO is below target but no individual item is below 50, no action
  if (perception.avgSEOScore < 80 && perception.totalContent > 0) {
    return {
      shouldAct: false,
      action: 'monitor',
      reasoning: `Average SEO score is ${perception.avgSEOScore}/80 target. No critical items below 50 -- monitoring.`,
      confidence: 0.9,
    };
  }

  return { shouldAct: false, action: 'idle', reasoning: 'All content meets SEO targets.', confidence: 1 };
};

const seoGuardianAct: AgentActFn = async (action, perception, store, settings, memory) => {
  if (action.startsWith('fix_seo:')) {
    const contentId = parseInt(action.split(':')[1], 10);
    const item = store.content.find((c) => c.id === contentId);
    if (!item) {
      return { success: false, result: { queueType: 'seo-fix' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
    }

    // Heuristic SEO fixes -- zero credits
    const fixes: Record<string, unknown> = { contentId };
    const issues: string[] = [];

    if (!item.metaTitle || item.metaTitle.length < 30) {
      fixes.metaTitle = item.title.slice(0, 60);
      issues.push('Missing/short meta title');
    }
    if (!item.metaDescription || item.metaDescription.length < 80) {
      fixes.metaDescription = `Learn about ${item.keyword || item.title}. Comprehensive guide with expert insights.`;
      issues.push('Missing/short meta description');
    }
    if (item.keyword && item.title && !item.title.toLowerCase().includes(item.keyword.toLowerCase())) {
      issues.push('Keyword not in title');
    }

    // If we found heuristic fixes, queue them (0 credits)
    if (issues.length > 0) {
      return {
        success: true,
        result: {
          queueType: 'seo-fix' as QueueItemType,
          title: `SEO fix: ${item.title}`,
          description: `Issues found: ${issues.join(', ')}`,
          data: fixes,
          preview: issues.map((i) => `- ${i}`).join('\n'),
          impact: issues.length > 2 ? 'high' as const : 'medium' as const,
        },
        creditsUsed: 0,
      };
    }

    // If heuristic can't fix it, use AI for nuanced suggestions (1 credit)
    const avoidStr = memory.avoidPatterns.length > 0 ? `\nAvoid: ${memory.avoidPatterns.join(', ')}` : '';
    try {
      const aiResponse = await agentAICall(
        `Analyze this content and suggest SEO improvements:\nTitle: ${item.title}\nKeyword: ${item.keyword || 'none'}\nMeta: ${item.metaTitle || 'none'}\nWord count: ${item.wordCount}\nCurrent SEO score: ${item.seoScore}${avoidStr}\n\nProvide a better meta title (max 60 chars) and meta description (max 160 chars) as JSON: {"metaTitle": "...", "metaDescription": "..."}`,
        'You are an SEO expert. Return only valid JSON.',
        settings,
      );
      const parsed = JSON.parse(aiResponse);
      return {
        success: true,
        result: {
          queueType: 'meta-fix' as QueueItemType,
          title: `AI SEO fix: ${item.title}`,
          description: 'AI-generated meta title and description improvements',
          data: { contentId, metaTitle: parsed.metaTitle, metaDescription: parsed.metaDescription },
          preview: `**Meta Title:** ${parsed.metaTitle}\n**Meta Desc:** ${parsed.metaDescription}`,
          impact: 'medium' as const,
        },
        creditsUsed: 1,
      };
    } catch {
      return { success: false, result: { queueType: 'seo-fix' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
    }
  }
  return { success: false, result: { queueType: 'seo-fix' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
};

// 2. Content Strategist ----------------------------------------------------

const contentStrategistReason: AgentReasonFn = async (perception, memory) => {
  // Heuristic: if keywords exist without content, plan content for them
  if (perception.keywordsWithoutContent.length > 0) {
    const kw = perception.keywordsWithoutContent[0];
    const recentlyPlanned = memory.recentDecisions.some(
      (d) => d.action.includes(kw) && d.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000,
    );
    if (recentlyPlanned) {
      // Try next keyword
      const nextKw = perception.keywordsWithoutContent.find(
        (k) => !memory.recentDecisions.some((d) => d.action.includes(k) && d.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000),
      );
      if (!nextKw) return { shouldAct: false, action: 'wait', reasoning: 'All uncovered keywords have been recently planned.', confidence: 0.9 };
      return {
        shouldAct: true,
        action: `plan_content:${nextKw}`,
        reasoning: `Keyword "${nextKw}" has no matching content. Planning an article.`,
        confidence: 0.8,
      };
    }
    return {
      shouldAct: true,
      action: `plan_content:${kw}`,
      reasoning: `Keyword "${kw}" has no matching content. ${perception.keywordsWithoutContent.length} total keywords uncovered.`,
      confidence: 0.85,
    };
  }

  // No content at all
  if (perception.totalContent === 0 && perception.totalKeywords === 0) {
    return {
      shouldAct: false,
      action: 'wait',
      reasoning: 'No content or keywords yet. Add keywords first to guide content strategy.',
      confidence: 1,
    };
  }

  return { shouldAct: false, action: 'idle', reasoning: 'All keywords have matching content. Strategy is on track.', confidence: 0.9 };
};

const contentStrategistAct: AgentActFn = async (action, perception, store, settings, memory) => {
  if (action.startsWith('plan_content:')) {
    const keyword = action.replace('plan_content:', '');
    const niche = perception.niche || 'general';
    const successHints = memory.successPatterns.length > 0 ? `\nUser prefers: ${memory.successPatterns.slice(0, 3).join(', ')}` : '';
    const avoidHints = memory.avoidPatterns.length > 0 ? `\nAvoid: ${memory.avoidPatterns.slice(0, 3).join(', ')}` : '';

    try {
      const aiResponse = await agentAICall(
        `Create a content plan for keyword: "${keyword}"\nNiche: ${niche}${successHints}${avoidHints}\n\nReturn JSON: {"title": "...", "outline": "brief 3-4 point outline", "angle": "unique angle", "targetWordCount": number}`,
        'You are a content strategist. Return only valid JSON.',
        settings,
      );
      const plan = JSON.parse(aiResponse);
      return {
        success: true,
        result: {
          queueType: 'content-plan' as QueueItemType,
          title: `Content plan: ${plan.title || keyword}`,
          description: `Article planned for keyword "${keyword}" in ${niche} niche`,
          data: { keyword, title: plan.title, outline: plan.outline, angle: plan.angle, targetWordCount: plan.targetWordCount },
          preview: `**${plan.title}**\n\n${plan.outline}\n\nAngle: ${plan.angle}\nTarget: ${plan.targetWordCount} words`,
          impact: 'medium' as const,
        },
        creditsUsed: 1,
      };
    } catch {
      // Fallback: heuristic plan (0 credits)
      return {
        success: true,
        result: {
          queueType: 'content-plan' as QueueItemType,
          title: `Content plan: ${keyword}`,
          description: `Basic content plan for keyword "${keyword}"`,
          data: { keyword, title: `Complete Guide to ${keyword}`, outline: 'Introduction, Main points, FAQ, Conclusion', angle: 'Comprehensive guide', targetWordCount: 1500 },
          preview: `**Complete Guide to ${keyword}**\n\nOutline: Introduction, Main points, FAQ, Conclusion\nTarget: 1500 words`,
          impact: 'low' as const,
        },
        creditsUsed: 0,
      };
    }
  }
  return { success: false, result: { queueType: 'content-plan' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
};

// 3. Keyword Scout ---------------------------------------------------------

const keywordScoutReason: AgentReasonFn = async (perception) => {
  if (perception.totalKeywords < 5 && perception.niche !== 'general') {
    return {
      shouldAct: true,
      action: 'discover_keywords',
      reasoning: `Only ${perception.totalKeywords} keywords tracked in "${perception.niche}" niche. Discovering more opportunities.`,
      confidence: 0.8,
    };
  }
  if (perception.totalKeywords === 0) {
    return {
      shouldAct: false,
      action: 'wait',
      reasoning: 'No niche configured. Set up your niche in onboarding or settings first.',
      confidence: 1,
    };
  }
  return { shouldAct: false, action: 'idle', reasoning: `${perception.totalKeywords} keywords tracked. Run manually to discover more.`, confidence: 0.9 };
};

const keywordScoutAct: AgentActFn = async (action, perception, store, settings, memory) => {
  if (action === 'discover_keywords') {
    const niche = perception.niche;
    const existing = store.keywords.map((k) => k.keyword).join(', ');
    const avoidHints = memory.avoidPatterns.length > 0 ? `\nDo NOT suggest keywords related to: ${memory.avoidPatterns.join(', ')}` : '';

    try {
      const aiResponse = await agentAICall(
        `Suggest 3 high-value keywords for the "${niche}" niche.\nAlready tracking: ${existing || 'none'}${avoidHints}\n\nReturn JSON array: [{"keyword": "...", "volume": estimated_monthly_volume, "difficulty": 1-100}]`,
        'You are a keyword research expert. Return only a valid JSON array.',
        settings,
      );
      const keywords = JSON.parse(aiResponse);
      if (!Array.isArray(keywords) || keywords.length === 0) {
        return { success: false, result: { queueType: 'keyword' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 1 };
      }

      const firstKw = keywords[0];
      return {
        success: true,
        result: {
          queueType: 'keyword' as QueueItemType,
          title: `New keyword: ${firstKw.keyword}`,
          description: `Discovered keyword opportunity in ${niche} niche`,
          data: { keyword: firstKw.keyword, volume: firstKw.volume ?? 100, difficulty: firstKw.difficulty ?? 50, trend: 'stable' as const },
          preview: keywords.map((k: { keyword: string; volume?: number; difficulty?: number }) => `- **${k.keyword}** (vol: ${k.volume ?? '?'}, diff: ${k.difficulty ?? '?'})`).join('\n'),
          impact: 'low' as const,
        },
        creditsUsed: 1,
      };
    } catch {
      return { success: false, result: { queueType: 'keyword' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
    }
  }
  return { success: false, result: { queueType: 'keyword' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
};

// 4. Draft Writer ----------------------------------------------------------

const draftWriterReason: AgentReasonFn = async (perception, memory) => {
  // Only write if there are keywords without content and not too many drafts
  if (perception.draftCount > 3) {
    return { shouldAct: false, action: 'wait', reasoning: `${perception.draftCount} drafts already pending. Finish those before writing more.`, confidence: 0.9 };
  }
  if (perception.keywordsWithoutContent.length > 0) {
    const kw = perception.keywordsWithoutContent[0];
    const recentlyDrafted = memory.recentDecisions.some(
      (d) => d.action.includes(kw) && d.timestamp > Date.now() - 3 * 24 * 60 * 60 * 1000,
    );
    if (recentlyDrafted) return { shouldAct: false, action: 'wait', reasoning: `Already drafted for "${kw}" recently.`, confidence: 0.9 };
    return {
      shouldAct: true,
      action: `write_draft:${kw}`,
      reasoning: `Keyword "${kw}" has no content. Writing a first draft.`,
      confidence: 0.75,
    };
  }
  return { shouldAct: false, action: 'idle', reasoning: 'No keywords need drafts right now.', confidence: 0.9 };
};

const draftWriterAct: AgentActFn = async (action, perception, store, settings, memory) => {
  if (action.startsWith('write_draft:')) {
    const keyword = action.replace('write_draft:', '');
    const niche = perception.niche;
    const successHints = memory.successPatterns.length > 0 ? `\nUser likes: ${memory.successPatterns.slice(0, 3).join(', ')}` : '';
    const avoidHints = memory.avoidPatterns.length > 0 ? `\nAvoid: ${memory.avoidPatterns.slice(0, 3).join(', ')}` : '';
    const prefs = Object.entries(memory.userPreferences).map(([k, v]) => `${k}: ${v}`).join(', ');
    const prefStr = prefs ? `\nPreferences: ${prefs}` : '';

    try {
      const aiResponse = await agentAICall(
        `Write a comprehensive article for keyword: "${keyword}"\nNiche: ${niche}${successHints}${avoidHints}${prefStr}\n\nReturn JSON: {"title": "...", "metaTitle": "max 60 chars", "metaDescription": "max 160 chars", "body": "full article in markdown, at least 800 words with H2s and H3s", "wordCount": number}`,
        'You are an expert content writer. Return only valid JSON. Write engaging, well-structured content.',
        settings,
      );
      const draft = JSON.parse(aiResponse);
      const slug = (draft.title || keyword).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
      return {
        success: true,
        result: {
          queueType: 'draft' as QueueItemType,
          title: `Draft: ${draft.title || keyword}`,
          description: `AI-generated draft for "${keyword}" (${draft.wordCount || '?'} words)`,
          data: { title: draft.title, slug, keyword, body: draft.body, metaTitle: draft.metaTitle, metaDescription: draft.metaDescription, wordCount: draft.wordCount ?? 0, aiScore: 70, seoScore: 60 },
          preview: `**${draft.title}**\n\n${(draft.body || '').slice(0, 300)}...`,
          impact: 'high' as const,
        },
        creditsUsed: 1,
      };
    } catch {
      return { success: false, result: { queueType: 'draft' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
    }
  }
  return { success: false, result: { queueType: 'draft' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
};

// 5. Performance Analyst ---------------------------------------------------

const performanceAnalystReason: AgentReasonFn = async (perception) => {
  if (perception.decliningContent.length > 0) {
    return {
      shouldAct: true,
      action: `alert_decline:${perception.decliningContent[0]}`,
      reasoning: `Content "${perception.decliningContent[0]}" is declining in rankings.`,
      confidence: 0.9,
    };
  }
  if (perception.lowCTRContent.length > 0) {
    return {
      shouldAct: true,
      action: `fix_ctr:${perception.lowCTRContent[0]}`,
      reasoning: `Content "${perception.lowCTRContent[0]}" has low CTR despite impressions. Title/description may need improvement.`,
      confidence: 0.8,
    };
  }
  // Heuristic: check if any published content has never been updated
  return { shouldAct: false, action: 'idle', reasoning: 'No performance issues detected. Connect GSC for real performance data.', confidence: 0.7 };
};

const performanceAnalystAct: AgentActFn = async (action, _perception, store, settings) => {
  if (action.startsWith('fix_ctr:')) {
    const slug = action.replace('fix_ctr:', '');
    const item = store.content.find((c) => (c.slug ?? c.title) === slug);
    if (!item) return { success: false, result: { queueType: 'title-suggestion' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };

    try {
      const aiResponse = await agentAICall(
        `This article has low CTR. Suggest a more clickable title:\nCurrent: "${item.title}"\nKeyword: "${item.keyword || 'none'}"\n\nReturn JSON: {"title": "new compelling title"}`,
        'You are a CTR optimization expert. Return only valid JSON.',
        settings,
      );
      const parsed = JSON.parse(aiResponse);
      return {
        success: true,
        result: {
          queueType: 'title-suggestion' as QueueItemType,
          title: `Better title for: ${item.title}`,
          description: 'AI-suggested title to improve click-through rate',
          data: { contentId: item.id, title: parsed.title },
          preview: `**Current:** ${item.title}\n**Suggested:** ${parsed.title}`,
          impact: 'medium' as const,
        },
        creditsUsed: 1,
      };
    } catch {
      return { success: false, result: { queueType: 'title-suggestion' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
    }
  }
  return { success: false, result: { queueType: 'title-suggestion' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
};

// 6. Freshness Keeper ------------------------------------------------------

const freshnessKeeperReason: AgentReasonFn = async (perception, memory) => {
  if (perception.staleContent.length > 0) {
    const stalest = perception.staleContent.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)[0];
    const recentlyRefreshed = memory.recentDecisions.some(
      (d) => d.action.includes(stalest.slug) && d.timestamp > Date.now() - 14 * 24 * 60 * 60 * 1000,
    );
    if (recentlyRefreshed) return { shouldAct: false, action: 'wait', reasoning: `Already suggested refresh for "${stalest.slug}" recently.`, confidence: 0.9 };
    return {
      shouldAct: true,
      action: `refresh:${stalest.id}`,
      reasoning: `Content "${stalest.slug}" hasn't been updated in ${stalest.daysSinceUpdate} days. Suggesting refresh.`,
      confidence: 0.8,
    };
  }
  return { shouldAct: false, action: 'idle', reasoning: 'All content is fresh (updated within 60 days).', confidence: 0.9 };
};

const freshnessKeeperAct: AgentActFn = async (action, _perception, store) => {
  if (action.startsWith('refresh:')) {
    const contentId = parseInt(action.split(':')[1], 10);
    const item = store.content.find((c) => c.id === contentId);
    if (!item) return { success: false, result: { queueType: 'content-refresh' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };

    const daysSince = Math.floor((Date.now() - item.updated) / (24 * 60 * 60 * 1000));
    // Heuristic suggestion (0 credits) -- tell user what to update
    return {
      success: true,
      result: {
        queueType: 'content-refresh' as QueueItemType,
        title: `Refresh needed: ${item.title}`,
        description: `Content hasn't been updated in ${daysSince} days. Review for outdated information.`,
        data: { contentId: item.id, suggestion: 'Review and update statistics, links, and examples' },
        preview: `**${item.title}** -- last updated ${daysSince} days ago.\n\nSuggested actions:\n- Update any statistics or dates\n- Check for broken links\n- Add recent examples or developments\n- Refresh the introduction`,
        impact: daysSince > 120 ? 'high' as const : 'medium' as const,
      },
      creditsUsed: 0,
    };
  }
  return { success: false, result: { queueType: 'content-refresh' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
};

// 7. Link Builder ----------------------------------------------------------

const linkBuilderReason: AgentReasonFn = async (perception) => {
  // Heuristic: if we have enough content, suggest interlinks
  if (perception.totalContent >= 3) {
    return {
      shouldAct: true,
      action: 'suggest_interlinks',
      reasoning: `${perception.totalContent} articles available for internal linking. Checking for opportunities.`,
      confidence: 0.7,
    };
  }
  return { shouldAct: false, action: 'idle', reasoning: 'Need at least 3 articles to build interlinks.', confidence: 1 };
};

const linkBuilderAct: AgentActFn = async (action, _perception, store) => {
  if (action === 'suggest_interlinks') {
    // Pure heuristic: find content with same keywords/topics (0 credits)
    const published = store.content.filter((c) => c.status === 'published');
    if (published.length < 2) {
      return { success: false, result: { queueType: 'interlink' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
    }

    // Find pairs with overlapping keywords
    const suggestions: Array<{ from: string; to: string; fromId: number; toId: number }> = [];
    for (let i = 0; i < published.length && suggestions.length < 3; i++) {
      for (let j = i + 1; j < published.length && suggestions.length < 3; j++) {
        const a = published[i];
        const b = published[j];
        // Check keyword overlap or title word overlap
        const aWords = new Set((a.title + ' ' + (a.keyword || '')).toLowerCase().split(/\s+/));
        const bWords = new Set((b.title + ' ' + (b.keyword || '')).toLowerCase().split(/\s+/));
        const overlap = [...aWords].filter((w) => bWords.has(w) && w.length > 3).length;
        if (overlap >= 2) {
          suggestions.push({ from: a.title, to: b.title, fromId: a.id, toId: b.id });
        }
      }
    }

    if (suggestions.length === 0) {
      return { success: false, result: { queueType: 'interlink' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
    }

    return {
      success: true,
      result: {
        queueType: 'interlink' as QueueItemType,
        title: `Interlink opportunity: ${suggestions.length} suggestions`,
        description: 'Heuristic-based internal link suggestions from topic overlap',
        data: { suggestions },
        preview: suggestions.map((s) => `- Link **${s.from}** <-> **${s.to}**`).join('\n'),
        impact: 'low' as const,
      },
      creditsUsed: 0,
    };
  }
  return { success: false, result: { queueType: 'interlink' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
};

// 8. Distribution Agent ----------------------------------------------------

const distributionAgentReason: AgentReasonFn = async (perception) => {
  // Look for recently published content that hasn't been distributed
  if (perception.publishedCount > 0) {
    return {
      shouldAct: true,
      action: 'generate_social',
      reasoning: `${perception.publishedCount} published articles. Generating social post suggestion.`,
      confidence: 0.7,
    };
  }
  return { shouldAct: false, action: 'idle', reasoning: 'No published content to distribute.', confidence: 1 };
};

const distributionAgentAct: AgentActFn = async (action, _perception, store, settings, memory) => {
  if (action === 'generate_social') {
    const published = store.content.filter((c) => c.status === 'published');
    if (published.length === 0) {
      return { success: false, result: { queueType: 'social-post' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
    }

    // Pick the most recently published item
    const latest = published.sort((a, b) => b.updated - a.updated)[0];
    const avoidHints = memory.avoidPatterns.length > 0 ? `\nAvoid: ${memory.avoidPatterns.join(', ')}` : '';

    try {
      const aiResponse = await agentAICall(
        `Write a short, engaging social media post (tweet-length, max 280 chars) promoting this article:\nTitle: "${latest.title}"\nKeyword: "${latest.keyword || 'none'}"${avoidHints}\n\nReturn JSON: {"post": "...", "hashtags": ["tag1", "tag2"]}`,
        'You are a social media expert. Return only valid JSON.',
        settings,
      );
      const parsed = JSON.parse(aiResponse);
      return {
        success: true,
        result: {
          queueType: 'social-post' as QueueItemType,
          title: `Social post for: ${latest.title}`,
          description: 'AI-generated social media post for content distribution',
          data: { contentId: latest.id, post: parsed.post, hashtags: parsed.hashtags, platform: 'twitter' },
          preview: `${parsed.post}\n\n${(parsed.hashtags || []).map((t: string) => `#${t}`).join(' ')}`,
          impact: 'low' as const,
        },
        creditsUsed: 1,
      };
    } catch {
      // Fallback heuristic (0 credits)
      return {
        success: true,
        result: {
          queueType: 'social-post' as QueueItemType,
          title: `Social post for: ${latest.title}`,
          description: 'Auto-generated social post',
          data: { contentId: latest.id, post: `Check out our latest article: ${latest.title}`, hashtags: [], platform: 'twitter' },
          preview: `Check out our latest article: ${latest.title}`,
          impact: 'low' as const,
        },
        creditsUsed: 0,
      };
    }
  }
  return { success: false, result: { queueType: 'social-post' as QueueItemType, title: '', description: '', data: {}, impact: 'low' as const }, creditsUsed: 0 };
};

// ---------------------------------------------------------------------------
// Agent factory
// ---------------------------------------------------------------------------

function createAgent(
  id: string,
  name: string,
  role: string,
  goals: AgentGoal[],
  reasonFn: AgentReasonFn,
  actFn: AgentActFn,
): ConduitAgent {
  return new ConduitAgent(id, name, role, goals, reasonFn, actFn);
}

// ---------------------------------------------------------------------------
// Core agents registry
// ---------------------------------------------------------------------------

export const CORE_AGENTS: ConduitAgent[] = [
  createAgent(
    'seo-guardian',
    'SEO Guardian',
    'Monitor and fix SEO issues across all content',
    [
      { metric: 'avg_seo_score', target: 80, current: 0, priority: 'high' },
      { metric: 'low_seo_count', target: 0, current: 0, priority: 'critical' },
    ],
    seoGuardianReason,
    seoGuardianAct,
  ),
  createAgent(
    'content-strategist',
    'Content Strategist',
    'Plan content that fills keyword gaps and beats competitors',
    [
      { metric: 'keyword_coverage', target: 90, current: 0, priority: 'high' },
    ],
    contentStrategistReason,
    contentStrategistAct,
  ),
  createAgent(
    'keyword-scout',
    'Keyword Scout',
    'Discover new keyword opportunities from trends and competitor analysis',
    [
      { metric: 'keywords_tracked', target: 50, current: 0, priority: 'medium' },
    ],
    keywordScoutReason,
    keywordScoutAct,
  ),
  createAgent(
    'draft-writer',
    'Draft Writer',
    'Generate high-quality first drafts that need minimal editing',
    [],
    draftWriterReason,
    draftWriterAct,
  ),
  createAgent(
    'performance-analyst',
    'Performance Analyst',
    'Monitor content performance and identify declining/opportunity content',
    [
      { metric: 'declining_content', target: 0, current: 0, priority: 'critical' },
    ],
    performanceAnalystReason,
    performanceAnalystAct,
  ),
  createAgent(
    'freshness-keeper',
    'Freshness Keeper',
    'Keep content updated and relevant, refresh stale articles',
    [
      { metric: 'stale_content_count', target: 0, current: 0, priority: 'medium' },
    ],
    freshnessKeeperReason,
    freshnessKeeperAct,
  ),
  createAgent(
    'link-builder',
    'Link Builder',
    'Build internal link networks, detect orphan pages, suggest interlinks',
    [
      { metric: 'orphan_pages', target: 0, current: 0, priority: 'medium' },
    ],
    linkBuilderReason,
    linkBuilderAct,
  ),
  createAgent(
    'distribution-agent',
    'Distribution Agent',
    'Generate social posts and manage content distribution',
    [],
    distributionAgentReason,
    distributionAgentAct,
  ),
];

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

/** Load memory for all agents from persisted store */
export function loadAgentMemories(memories: Record<string, AgentMemory>): void {
  for (const agent of CORE_AGENTS) {
    agent.loadMemory(memories[agent.id]);
  }
}

/** Get all agent memories for persistence */
export function getAllAgentMemories(): Record<string, AgentMemory> {
  const result: Record<string, AgentMemory> = {};
  for (const agent of CORE_AGENTS) {
    result[agent.id] = agent.memory;
  }
  return result;
}

/** Run all agents and return results */
export async function runAllAgents(
  store: AgentWorkspaceView,
  settings: Record<string, string>,
): Promise<AgentRunResult[]> {
  const results: AgentRunResult[] = [];
  for (const agent of CORE_AGENTS) {
    const result = await agent.run(store, settings);
    results.push(result);
  }
  return results;
}

/** Run a single agent by ID */
export async function runAgentById(
  id: string,
  store: AgentWorkspaceView,
  settings: Record<string, string>,
): Promise<AgentRunResult | null> {
  const agent = CORE_AGENTS.find((a) => a.id === id);
  if (!agent) return null;
  return agent.run(store, settings);
}

/** Get all agent statuses for the dashboard */
export function getAllAgentStatuses(): Array<{
  id: string;
  name: string;
  role: string;
  status: ReturnType<ConduitAgent['getStatus']>;
}> {
  return CORE_AGENTS.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.getStatus(),
  }));
}

/** Process feedback from review queue back to agents */
export function processAgentFeedback(
  agentId: string,
  outcome: 'approved' | 'rejected',
  actionDescription: string,
  feedback?: string,
): void {
  const agent = CORE_AGENTS.find((a) => a.id === agentId);
  if (!agent) return;

  // Find the most recent pending decision for this agent
  const pendingIdx = agent.memory.recentDecisions.findIndex(
    (d) => d.outcome === 'pending',
  );

  if (pendingIdx >= 0) {
    // Update the decision
    agent.memory.recentDecisions[pendingIdx] = {
      ...agent.memory.recentDecisions[pendingIdx],
      outcome,
      userFeedback: feedback,
    };
    // Let the agent learn from this
    agent.learn(agent.memory.recentDecisions[pendingIdx]);
  } else {
    // Create a new decision entry and learn from it
    const decision = {
      timestamp: Date.now(),
      perception: 'feedback from review queue',
      reasoning: 'user reviewed agent suggestion',
      action: actionDescription,
      outcome: outcome as 'approved' | 'rejected',
      userFeedback: feedback,
    };
    agent.learn(decision);
  }
}
