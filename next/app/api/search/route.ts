import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  const responseHeaders = {
    ...corsHeaders,
    'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
  };

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const workspace = searchParams.get('workspace');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (!q || q.trim().length < 2) {
      return Response.json(
        { error: 'Query must be at least 2 characters', param: 'q' },
        { status: 400, headers: responseHeaders }
      );
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const lim = Math.min(parseInt(limit || '10') || 10, 50);
    const off = parseInt(offset || '0') || 0;
    const searchTerm = q.trim();

    // Use Postgres full-text search with ilike
    let query = supabase
      .from('content')
      .select('id, title, slug, excerpt, meta_desc, collection, author, tags, seo_score, ai_score, word_count, target_keyword, featured_image, published_at, updated_at')
      .eq('status', 'published')
      .or(`title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%,target_keyword.ilike.%${searchTerm}%`)
      .order('seo_score', { ascending: false })
      .range(off, off + lim - 1);

    if (workspace) query = query.eq('workspace_id', workspace);

    const { data, error } = await query;
    if (error) {
      return Response.json({ error: 'Search failed' }, { status: 500, headers: responseHeaders });
    }

    const results = (data || []).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt || r.meta_desc || '',
      collection: r.collection,
      author: r.author,
      tags: r.tags || [],
      keyword: r.target_keyword,
      seoScore: r.seo_score,
      wordCount: r.word_count,
      featuredImage: r.featured_image,
      publishedAt: r.published_at,
      updatedAt: r.updated_at,
    }));

    return Response.json(
      { query: searchTerm, results, count: results.length, limit: lim, offset: off },
      { status: 200, headers: responseHeaders }
    );
  } catch (err) {
    console.error('Search error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: responseHeaders });
  }
}
