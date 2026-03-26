const { createClient } = require('@supabase/supabase-js');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Headless CMS API — Public content delivery endpoint
 *
 * GET /api/content                    → list published articles
 * GET /api/content?slug=my-article    → single article by slug
 * GET /api/content?collection=Articles → filter by collection
 * GET /api/content?limit=10&offset=0  → pagination
 * GET /api/content?workspace=UUID     → specific workspace
 * GET /api/content?fields=title,slug,excerpt → select fields
 * GET /api/content?schema=true        → include JSON-LD schema
 *
 * Use this to power investingpro.in or any frontend from Conduit data.
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  // Cache for 60 seconds
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { slug, collection, limit, offset, workspace, fields, schema, tag, keyword, sort } = req.query;

    // Single article by slug
    if (slug) {
      let query = supabase
        .from('content')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (workspace) query = query.eq('workspace_id', workspace);

      const { data, error } = await query;
      if (error || !data) {
        return res.status(404).json({ error: 'Article not found' });
      }

      const article = formatArticle(data, fields);
      if (schema === 'true') {
        article.schema = generateSchemaLD(data);
      }

      return res.status(200).json(article);
    }

    // List articles
    let query = supabase
      .from('content')
      .select('id, title, slug, excerpt, status, collection, author, meta_title, meta_desc, tags, seo_score, ai_score, word_count, target_keyword, featured_image, published_at, created_at, updated_at')
      .eq('status', 'published');

    if (workspace) query = query.eq('workspace_id', workspace);
    if (collection) query = query.eq('collection', collection);
    if (tag) query = query.contains('tags', [tag]);
    if (keyword) query = query.eq('target_keyword', keyword);

    // Sorting
    const sortField = sort === 'score' ? 'seo_score' : sort === 'oldest' ? 'created_at' : 'updated_at';
    const sortAsc = sort === 'oldest';
    query = query.order(sortField, { ascending: sortAsc });

    // Pagination
    const lim = Math.min(parseInt(limit) || 20, 100);
    const off = parseInt(offset) || 0;
    query = query.range(off, off + lim - 1);

    const { data, error, count } = await query;
    if (error) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    const articles = (data || []).map(a => formatArticle(a, fields));

    return res.status(200).json({
      articles,
      pagination: {
        limit: lim,
        offset: off,
        returned: articles.length,
        hasMore: articles.length === lim,
      },
    });
  } catch (err) {
    console.error('content API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

function formatArticle(row, fields) {
  const article = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || row.meta_desc || '',
    body: row.body || undefined,
    collection: row.collection,
    author: row.author,
    metaTitle: row.meta_title,
    metaDescription: row.meta_desc,
    tags: row.tags || [],
    keyword: row.target_keyword,
    featuredImage: row.featured_image,
    seoScore: row.seo_score,
    aiScore: row.ai_score,
    wordCount: row.word_count,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Field selection
  if (fields) {
    const allowed = fields.split(',').map(f => f.trim());
    const filtered = {};
    allowed.forEach(f => {
      if (article[f] !== undefined) filtered[f] = article[f];
    });
    return filtered;
  }

  return article;
}

function generateSchemaLD(row) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: row.title,
    description: row.meta_desc || row.excerpt || '',
    author: { '@type': 'Person', name: row.author || 'Admin' },
    datePublished: row.published_at || row.created_at,
    dateModified: row.updated_at,
    wordCount: row.word_count || 0,
    keywords: (row.tags || []).join(', '),
    image: row.featured_image || undefined,
  };
}
