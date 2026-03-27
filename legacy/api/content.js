const { createClient } = require('@supabase/supabase-js');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

/**
 * Headless CMS API — Public content delivery endpoint
 *
 * GET /api/content                          -> list published articles
 * GET /api/content?slug=my-article          -> single article by slug
 * GET /api/content?collection=Articles      -> filter by collection
 * GET /api/content?page=1&limit=10          -> page-based pagination
 * GET /api/content?limit=10&offset=0        -> offset-based pagination (legacy)
 * GET /api/content?workspace=UUID           -> specific workspace
 * GET /api/content?fields=title,slug,excerpt -> select fields
 * GET /api/content?schema=true              -> include JSON-LD schema
 * GET /api/content?sort=created_at&order=desc -> sorting
 * GET /api/content?q=search+term            -> full-text search (title + body)
 * GET /api/content?status=draft             -> status filter (default: published)
 * GET /api/content?tag=javascript           -> filter by tag
 * GET /api/content?keyword=react            -> filter by target keyword
 *
 * Use this to power investingpro.in or any frontend from Conduit data.
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const {
      slug, collection, limit, offset, workspace, fields, schema,
      tag, keyword, sort, order, page, q, status,
    } = req.query;

    // Single article by slug
    if (slug) {
      let query = supabase
        .from('content')
        .select('*')
        .eq('slug', slug)
        .eq('status', status || 'published')
        .single();

      if (workspace) query = query.eq('workspace_id', workspace);

      const { data, error } = await query;
      if (error || !data) {
        return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });
      }

      const article = formatArticle(data, fields);
      if (schema === 'true') {
        article.schema = generateSchemaLD(data);
      }

      return res.status(200).json({ data: article });
    }

    // List articles
    const selectFields = 'id, title, slug, excerpt, body, status, collection, author, meta_title, meta_desc, tags, seo_score, ai_score, word_count, target_keyword, featured_image, published_at, created_at, updated_at, workspace_id';

    let query = supabase
      .from('content')
      .select(selectFields, { count: 'exact' })
      .eq('status', status || 'published');

    if (workspace) query = query.eq('workspace_id', workspace);
    if (collection) query = query.eq('collection', collection);
    if (tag) query = query.contains('tags', [tag]);
    if (keyword) query = query.eq('target_keyword', keyword);

    // Full-text search on title and body
    if (q) {
      const searchTerm = q.trim();
      query = query.or(`title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%`);
    }

    // Sorting — support both new (sort + order) and legacy (sort=score/oldest)
    let sortField;
    let sortAsc;
    if (sort === 'score' || sort === 'oldest') {
      // Legacy compat
      sortField = sort === 'score' ? 'seo_score' : 'created_at';
      sortAsc = sort === 'oldest';
    } else {
      sortField = sort || 'created_at';
      const validSortFields = ['created_at', 'updated_at', 'published_at', 'seo_score', 'ai_score', 'word_count', 'title'];
      if (validSortFields.indexOf(sortField) === -1) sortField = 'created_at';
      sortAsc = order === 'asc';
    }
    query = query.order(sortField, { ascending: sortAsc });

    // Pagination — support both page-based and offset-based
    const lim = Math.min(parseInt(limit) || 20, 100);
    let off;
    if (page) {
      const pageNum = Math.max(parseInt(page) || 1, 1);
      off = (pageNum - 1) * lim;
    } else {
      off = parseInt(offset) || 0;
    }
    query = query.range(off, off + lim - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error('content API query error:', error);
      return res.status(500).json({ error: 'Database query failed', code: 'DB_ERROR' });
    }

    const articles = (data || []).map(function(a) { return formatArticle(a, fields); });
    const total = count || 0;
    const currentPage = page ? Math.max(parseInt(page) || 1, 1) : Math.floor(off / lim) + 1;

    return res.status(200).json({
      data: articles,
      meta: {
        total: total,
        page: currentPage,
        limit: lim,
        hasMore: off + lim < total,
      },
      // Legacy compat
      articles: articles,
      pagination: {
        limit: lim,
        offset: off,
        returned: articles.length,
        hasMore: off + lim < total,
      },
    });
  } catch (err) {
    console.error('content API error:', err);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
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
    const allowed = fields.split(',').map(function(f) { return f.trim(); });
    const filtered = {};
    allowed.forEach(function(f) {
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
