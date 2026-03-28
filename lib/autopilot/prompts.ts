/**
 * AI prompt templates for each autopilot phase.
 *
 * Placeholders: {niche}, {language}, {audience}, {goal}, {competitors}
 * All prompts that expect structured data request JSON output for reliable parsing.
 */

// ---------------------------------------------------------------------------
// Keyword Discovery
// ---------------------------------------------------------------------------

export const KEYWORD_DISCOVERY_PROMPT = `You are an expert SEO strategist specialising in the "{niche}" niche.

Target audience: {audience}
Content goal: {goal}
Language: {language}
Competitor domains (for reference): {competitors}

The user already tracks these keywords:
{existingKeywords}

Suggest exactly 10 NEW keyword opportunities that are NOT in the existing list.
For each keyword provide:
- keyword: the exact search phrase (lowercase)
- estimatedVolume: "high" | "medium" | "low"
- estimatedDifficulty: "high" | "medium" | "low"
- intent: "informational" | "transactional" | "navigational" | "commercial"
- reason: one sentence explaining why this keyword is a good opportunity
- score: 0-100 opportunity score (higher = better opportunity considering volume, difficulty, and relevance)

Focus on:
- Long-tail keywords that are easier to rank for
- Keywords with clear search intent matching the content goal
- Keywords that complement existing tracked keywords
- Gaps competitors might be missing

Return ONLY a valid JSON array, no markdown fences, no extra text.

Example format:
[{"keyword":"example phrase","estimatedVolume":"medium","estimatedDifficulty":"low","intent":"informational","reason":"High relevance with low competition","score":78}]`;

// ---------------------------------------------------------------------------
// Content Planning
// ---------------------------------------------------------------------------

export const CONTENT_PLAN_PROMPT = `You are a content strategist for a "{niche}" website.

Target audience: {audience}
Content goal: {goal}
Language: {language}

Available keywords (with opportunity scores):
{keywords}

Existing content titles (to avoid duplication):
{existingTitles}

Create exactly {count} content plans for the highest-priority keywords that have no matching content yet.
For each plan provide:
- title: SEO-optimised article title (include the keyword naturally)
- keyword: the target keyword from the list
- outline: array of 4-8 section headings (H2-level)
- targetWordCount: recommended word count (800-2500 based on intent)
- contentType: "article" | "guide" | "comparison" | "listicle"
- priority: "high" | "medium" | "low"
- scheduledDate: ISO date string spread across the next 7 days (one per day max)

Schedule high-priority items earlier. Mix content types for variety.

Return ONLY a valid JSON array, no markdown fences, no extra text.

Example format:
[{"title":"How to Do X: Complete Guide","keyword":"how to do x","outline":["What Is X","Why X Matters","Step-by-Step Process","Common Mistakes","FAQ"],"targetWordCount":1800,"contentType":"guide","priority":"high","scheduledDate":"2026-03-29"}]`;

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
