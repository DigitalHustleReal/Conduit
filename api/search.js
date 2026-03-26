const { createClient } = require('@supabase/supabase-js');

/**
 * Full-text search API — /api/search
 * GET /api/search?q=keyword research      → search titles + body
 * GET /api/search?q=seo&workspace=UUID    → workspace-scoped
 * GET /api/search?q=guide&limit=10        → paginated
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { q, workspace, limit, offset } = req.query;
    if (!q || q.trim().length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters', param: 'q' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const lim = Math.min(parseInt(limit) || 10, 50);
    const off = parseInt(offset) || 0;
    const searchTerm = q.trim();

    // Use Postgres full-text search with ts_rank
    let query = supabase
      .from('content')
      .select('id, title, slug, excerpt, meta_desc, collection, author, tags, seo_score, ai_score, word_count, target_keyword, featured_image, published_at, updated_at')
      .eq('status', 'published')
      .or(`title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%,target_keyword.ilike.%${searchTerm}%`)
      .order('seo_score', { ascending: false })
      .range(off, off + lim - 1);

    if (workspace) query = query.eq('workspace_id', workspace);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Search failed' });

    const results = (data || []).map(function(r) {
      return {
        id: r.id, title: r.title, slug: r.slug,
        excerpt: r.excerpt || r.meta_desc || '',
        collection: r.collection, author: r.author,
        tags: r.tags || [], keyword: r.target_keyword,
        seoScore: r.seo_score, wordCount: r.word_count,
        featuredImage: r.featured_image,
        publishedAt: r.published_at, updatedAt: r.updated_at,
      };
    });

    return res.status(200).json({ query: searchTerm, results, count: results.length, limit: lim, offset: off });
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
