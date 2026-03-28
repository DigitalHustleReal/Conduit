/**
 * Google Autocomplete -- FREE real keyword data, no API key needed.
 * Uses Google's Suggest API to get REAL search suggestions.
 *
 * Also uses "alphabet soup" technique: query + a, query + b, ... query + z
 * to discover long-tail keywords people actually type.
 *
 * NOTE: These functions call our own /api/keywords/suggest route which
 * proxies to Google server-side (avoids CORS).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutocompleteResult {
  keyword: string;
  source: 'autocomplete' | 'alphabet' | 'related';
  position: number;
}

// ---------------------------------------------------------------------------
// Server-side: direct Google Suggest fetch (used by API route only)
// ---------------------------------------------------------------------------

/**
 * Fetch real Google autocomplete suggestions directly from Google Suggest API.
 * This MUST run server-side (Node.js / API route) -- browsers are blocked by CORS.
 */
export async function getGoogleSuggestions(
  query: string,
  geo: string = 'IN',
  lang: string = 'en',
): Promise<AutocompleteResult[]> {
  if (!query.trim()) return [];

  const encoded = encodeURIComponent(query.trim());
  const url = `https://suggestqueries.google.com/complete/search?q=${encoded}&client=firefox&hl=${lang}&gl=${geo}&output=json`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Conduit/1.0)',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    // Google returns: [query, [suggestion1, suggestion2, ...]]
    const suggestions: string[] = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];

    return suggestions.map((s, i) => ({
      keyword: s,
      source: 'autocomplete' as const,
      position: i + 1,
    }));
  } catch {
    return [];
  }
}

/**
 * Get alphabet variations: "query a", "query b", ... "query z"
 * Discovers long-tail keywords people actually search for.
 */
export async function getAlphabetExpansions(
  query: string,
  geo: string = 'IN',
): Promise<AutocompleteResult[]> {
  if (!query.trim()) return [];

  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const results: AutocompleteResult[] = [];
  const seen = new Set<string>();

  // Run in batches of 5 to avoid hammering Google
  for (let i = 0; i < alphabet.length; i += 5) {
    const batch = alphabet.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map((letter) => getGoogleSuggestions(`${query.trim()} ${letter}`, geo)),
    );

    for (const suggestions of batchResults) {
      for (const s of suggestions) {
        const lower = s.keyword.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          results.push({
            keyword: s.keyword,
            source: 'alphabet',
            position: s.position,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Get "People Also Ask" style questions by appending question words.
 */
export async function getRelatedQuestions(
  query: string,
  geo: string = 'IN',
): Promise<string[]> {
  if (!query.trim()) return [];

  const prefixes = [
    'how to', 'what is', 'why', 'when to', 'where to',
    'is', 'can', 'does', 'should', 'which',
  ];

  const questions: string[] = [];
  const seen = new Set<string>();

  // Fetch question-style completions
  const batchResults = await Promise.all(
    prefixes.map((prefix) => getGoogleSuggestions(`${prefix} ${query.trim()}`, geo)),
  );

  for (const suggestions of batchResults) {
    for (const s of suggestions) {
      const lower = s.keyword.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        questions.push(s.keyword);
      }
    }
  }

  return questions;
}

/**
 * Combined: get suggestions + alphabet expansions + questions in one call.
 * This is the main entry point for keyword discovery.
 */
export async function expandKeyword(
  query: string,
  geo: string = 'IN',
): Promise<{
  suggestions: AutocompleteResult[];
  questions: string[];
  totalFound: number;
}> {
  const [baseSuggestions, alphabetSuggestions, questions] = await Promise.all([
    getGoogleSuggestions(query, geo),
    getAlphabetExpansions(query, geo),
    getRelatedQuestions(query, geo),
  ]);

  // Merge and deduplicate suggestions
  const seen = new Set<string>();
  const allSuggestions: AutocompleteResult[] = [];

  for (const s of [...baseSuggestions, ...alphabetSuggestions]) {
    const lower = s.keyword.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      allSuggestions.push(s);
    }
  }

  return {
    suggestions: allSuggestions,
    questions,
    totalFound: allSuggestions.length + questions.length,
  };
}

// ---------------------------------------------------------------------------
// Client-side: calls our API route (use from browser components)
// ---------------------------------------------------------------------------

/**
 * Client-safe wrapper: fetches suggestions via our /api/keywords/suggest route.
 * Use this from React components instead of calling Google directly.
 */
export async function fetchSuggestionsClient(
  query: string,
  geo: string = 'IN',
  lang: string = 'en',
): Promise<AutocompleteResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({ q: query.trim(), geo, lang });
  try {
    const res = await fetch(`/api/keywords/suggest?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.suggestions || [];
  } catch {
    return [];
  }
}
