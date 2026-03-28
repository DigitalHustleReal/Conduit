import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSuggestions } from '@/lib/seo/google-autocomplete';

// ---------------------------------------------------------------------------
// In-memory cache: keyword -> { data, expiry }
// ---------------------------------------------------------------------------

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });

  // Evict old entries if cache grows too large
  if (cache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now > v.expiry) cache.delete(k);
    }
    // If still too large, drop oldest half
    if (cache.size > 5000) {
      const keys = [...cache.keys()];
      for (let i = 0; i < keys.length / 2; i++) {
        cache.delete(keys[i]);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rate limiting: IP -> timestamps[]
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Remove old timestamps
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  rateLimitMap.set(ip, recent);

  if (recent.length >= RATE_LIMIT_MAX) return true;

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

// ---------------------------------------------------------------------------
// GET /api/keywords/suggest?q=keyword&geo=IN&lang=en
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q')?.trim();
  const geo = searchParams.get('geo') || 'IN';
  const lang = searchParams.get('lang') || 'en';

  if (!query) {
    return NextResponse.json(
      { error: 'Missing required parameter: q' },
      { status: 400 },
    );
  }

  if (query.length > 200) {
    return NextResponse.json(
      { error: 'Query too long (max 200 characters)' },
      { status: 400 },
    );
  }

  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 10 requests per minute.' },
      { status: 429 },
    );
  }

  // Check cache
  const cacheKey = `${query.toLowerCase()}|${geo}|${lang}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Fetch from Google Suggest API server-side
  try {
    const suggestions = await getGoogleSuggestions(query, geo, lang);

    const response = {
      query,
      geo,
      lang,
      suggestions,
      count: suggestions.length,
      cached: false,
    };

    setCache(cacheKey, { ...response, cached: true });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 502 },
    );
  }
}
