/**
 * AI prompt templates for each autopilot phase.
 *
 * Placeholders: {niche}, {language}, {audience}, {goal}, {competitors}
 * All prompts that expect structured data request JSON output for reliable parsing.
 */

// ---------------------------------------------------------------------------
// Keyword Discovery
// ---------------------------------------------------------------------------

export const KEYWORD_DISCOVERY_PROMPT = `You are an expert SEO strategist and competitive intelligence analyst specialising in the "{niche}" niche.

Target audience: {audience}
Content goal: {goal}
Language: {language}
User's domain: {domain}
Competitor domains to analyze: {competitors}

The user already tracks these keywords:
{existingKeywords}

Your job is to do a COMPREHENSIVE niche scan. Act as if you are:
1. Analyzing what competitors ({competitors}) are ranking for that this user is NOT
2. Identifying trending topics and recent developments in {niche} (think: what's happening RIGHT NOW in this industry — new regulations, product launches, seasonal trends, market shifts)
3. Finding content gaps where demand exists but supply is thin
4. Spotting long-tail opportunities with clear buyer/reader intent

For today's date context: it is March 2026. Factor in any recent industry changes, regulatory updates, seasonal relevance, and emerging trends.

Suggest exactly 10 NEW keyword opportunities that are NOT in the existing list.
For each keyword provide:
- keyword: the exact search phrase people are searching (lowercase)
- estimatedVolume: "high" | "medium" | "low"
- estimatedDifficulty: "high" | "medium" | "low"
- intent: "informational" | "transactional" | "navigational" | "commercial"
- reason: one sentence explaining WHY this keyword is an opportunity right now — reference competitor gaps, trends, or timing
- score: 0-100 opportunity score (higher = better considering volume, difficulty, relevance, and timing)
- source: where this opportunity comes from — "competitor_gap" | "trending" | "seasonal" | "long_tail" | "content_gap" | "emerging"

Prioritize:
- Keywords competitors rank for but this user doesn't (competitor gaps)
- Topics trending in the last 3-6 months in this niche
- Seasonal keywords relevant to the current month/quarter
- Long-tail keywords with clear search intent matching the content goal
- Emerging topics that have low competition because they're new

Return ONLY a valid JSON array, no markdown fences, no extra text.

Example format:
[{"keyword":"best sip plans for 2026","estimatedVolume":"high","estimatedDifficulty":"medium","intent":"commercial","reason":"Competitor groww.in ranks #3, user has no content. High seasonal relevance for tax planning season.","score":85,"source":"competitor_gap"}]`;

// ---------------------------------------------------------------------------
// Content Planning
// ---------------------------------------------------------------------------

export const CONTENT_PLAN_PROMPT = `You are a senior content strategist for a "{niche}" website competing against: {competitors}.

Target audience: {audience}
Content goal: {goal}
Language: {language}
User's domain: {domain}
Today's date: {today}

Available keywords (with opportunity scores and sources):
{keywords}

Existing content titles (to avoid duplication):
{existingTitles}

Your job is to create a STRATEGIC content calendar — not just random articles. Think like a content director:

1. COMPETITOR COUNTER-PROGRAMMING: If a keyword source is "competitor_gap", plan content that's BETTER than what competitors have — more comprehensive, more current, better structured
2. TREND RIDING: If a keyword is "trending" or "seasonal", prioritize it — these are time-sensitive opportunities
3. TOPICAL AUTHORITY: Cluster related keywords into pillar + supporting articles — don't scatter randomly
4. CONTENT MIX: Balance informational (builds traffic) with commercial (drives revenue) based on the content goal

Create exactly {count} content plans for the highest-priority keywords that have no matching content yet.
For each plan provide:
- title: SEO-optimised article title that would beat competitors (include the keyword naturally, use power words, include current year if relevant)
- keyword: the target keyword from the list
- outline: array of 5-8 section headings (H2-level) that cover the topic MORE comprehensively than competitors would
- targetWordCount: recommended word count (1200-3000 — longer for guides, shorter for news)
- contentType: "article" | "guide" | "comparison" | "listicle" | "how-to" | "news" | "case-study"
- priority: "high" | "medium" | "low"
- scheduledDate: ISO date string spread across the next 7 days
- angle: one sentence describing the unique angle — what makes THIS article better than what already exists
- competitorGap: what competitors are missing that this article should include

Schedule high-priority and trending items first. Mix content types. Build topical clusters.

Return ONLY a valid JSON array, no markdown fences, no extra text.

Example format:
[{"title":"Best SIP Plans for 2026: Expert Comparison (Updated March)","keyword":"best sip plans 2026","outline":["What Changed in 2026","Top 10 SIP Plans Compared","How to Choose","Tax Benefits","Common Mistakes","FAQ"],"targetWordCount":2200,"contentType":"comparison","priority":"high","scheduledDate":"2026-03-29","angle":"Updated for March 2026 with new SEBI regulations that competitors haven't covered yet","competitorGap":"No competitor has updated for the new expense ratio rules"}]`;

// ---------------------------------------------------------------------------
// Draft Generation
// ---------------------------------------------------------------------------

export const DRAFT_GENERATION_PROMPT = `You are an expert content writer for a "{niche}" website.

Target audience: {audience}
Language: {language}
Content goal: {goal}

Write a complete article based on this plan:
- Title: {title}
- Target keyword: {keyword}
- Content type: {contentType}
- Target word count: {targetWordCount}
- Outline sections: {outline}

Requirements:
1. Write in markdown format
2. Start with a compelling introduction that includes the keyword in the first 100 words
3. Use the outline sections as H2 headings (## Heading)
4. Add H3 sub-headings where appropriate
5. Include the keyword naturally 3-5 times throughout (aim for 1-2% density)
6. Write in a professional but accessible tone
7. Include a conclusion section
8. Aim for the target word count

Also provide optimised metadata:
- metaTitle: max 60 characters, includes keyword
- metaDescription: 120-155 characters, includes keyword, compelling CTA

Return a JSON object with these fields:
- body: the full markdown article
- metaTitle: the optimised meta title
- metaDescription: the optimised meta description

Return ONLY valid JSON, no markdown fences, no extra text.`;

// ---------------------------------------------------------------------------
// SEO Optimisation
// ---------------------------------------------------------------------------

export const SEO_OPTIMIZATION_PROMPT = `You are an SEO specialist reviewing content for a "{niche}" website.

Target keyword: {keyword}
Language: {language}

Current article metadata:
- Title: {title}
- Meta title: {metaTitle}
- Meta description: {metaDescription}
- Word count: {wordCount}

Current article body (markdown):
{body}

Analyse and fix these SEO issues:
1. Heading structure: ensure proper H2/H3 hierarchy
2. Keyword placement: keyword in first 100 words, in at least one H2, natural density 1-2%
3. Meta title: must be under 60 chars and include keyword
4. Meta description: must be 120-155 chars and include keyword
5. Internal link suggestions: suggest 2-3 topics from the same niche to link to
6. Readability: break up long paragraphs, use lists where appropriate

Return a JSON object with:
- body: the improved markdown article (with all fixes applied)
- metaTitle: corrected meta title
- metaDescription: corrected meta description
- seoScore: estimated score 0-100
- fixes: array of strings describing what was fixed
- internalLinkSuggestions: array of topic strings to link to

Return ONLY valid JSON, no markdown fences, no extra text.`;

// ---------------------------------------------------------------------------
// Performance Analysis
// ---------------------------------------------------------------------------

export const PERFORMANCE_ANALYSIS_PROMPT = `You are a content performance analyst for a "{niche}" website.

Analyse these published content items and identify issues:

{contentSummary}

For each item that needs attention, provide:
- contentId: the item's id
- title: the item's title
- issue: "stale" | "low_seo" | "low_engagement" | "thin_content" | "missing_meta"
- severity: "high" | "medium" | "low"
- recommendation: specific action to take (1 sentence)

Focus on:
- Content older than 90 days that may need a refresh
- Articles with SEO scores below 50
- Articles with word counts under 500
- Missing or poor meta titles/descriptions
- Titles that could be improved for CTR

Return ONLY a valid JSON array, no markdown fences, no extra text.

Example format:
[{"contentId":1,"title":"Example Article","issue":"stale","severity":"medium","recommendation":"Update statistics and add recent developments section"}]`;

// ---------------------------------------------------------------------------
// Helper to fill prompt templates
// ---------------------------------------------------------------------------

export function fillPrompt(
  template: string,
  vars: Record<string, string | number | string[]>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const replacement = Array.isArray(value) ? value.join(', ') : String(value);
    result = result.replaceAll(`{${key}}`, replacement);
  }
  return result;
}
