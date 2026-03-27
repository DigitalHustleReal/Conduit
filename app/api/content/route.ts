import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  status: string;
  collection: string | null;
  author: string | null;
  meta_title: string | null;
  meta_desc: string | null;
  tags: string[] | null;
  seo_score: number | null;
  ai_score: number | null;
  word_count: number | null;
  target_keyword: string | null;
  featured_image: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  workspace_id: string;
}

function formatArticle(row: ArticleRow, fields?: string | null): Record<string, unknown> {
  const article: Record<string, unknown> = {
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
    const allowed = fields.split(',').map((f: string) => f.trim());
    const filtered: Record<string, unknown> = {};
    allowed.forEach((f: string) => {
      if (article[f] !== undefined) filtered[f] = article[f];
    });
    return filtered;
  }

  return article;
}

function generateSchemaLD(row: ArticleRow) {
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

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  const responseHeaders = {
    ...corsHeaders,
    'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
  };

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const collection = searchParams.get('collection');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const workspace = searchParams.get('workspace');
    const fields = searchParams.get('fields');
    const schema = searchParams.get('schema');
    const tag = searchParams.get('tag');
    const keyword = searchParams.get('keyword');
    const sort = searchParams.get('sort');
    const order = searchParams.get('order');
    const page = searchParams.get('page');
    const q = searchParams.get('q');
    const status = searchParams.get('status');

    // Single article by slug
    if (slug) {
      let query = supabase
        .from('content')
        .select('*')
        .eq('slug', slug)
        .eq('status', status || 'published');

      if (workspace) query = query.eq('workspace_id', workspace);

      const { data: rows, error } = await query.limit(1);
      const data = rows?.[0] ?? null;
      if (error || !data) {
        return Response.json({ error: 'Article not found', code: 'NOT_FOUND' }, { status: 404, headers: responseHeaders });
      }

      const article = formatArticle(data as ArticleRow, fields);
      if (schema === 'true') {
        (article as Record<string, unknown>).schema = generateSchemaLD(data as ArticleRow);
      }

      return Response.json({ data: article }, { status: 200, headers: responseHeaders });
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

    // Sorting
    let sortField: string;
    let sortAsc: boolean;
    if (sort === 'score' || sort === 'oldest') {
      sortField = sort === 'score' ? 'seo_score' : 'created_at';
      sortAsc = sort === 'oldest';
    } else {
      sortField = sort || 'created_at';
      const validSortFields = ['created_at', 'updated_at', 'published_at', 'seo_score', 'ai_score', 'word_count', 'title'];
      if (validSortFields.indexOf(sortField) === -1) sortField = 'created_at';
      sortAsc = order === 'asc';
    }
    query = query.order(sortField, { ascending: sortAsc });

    // Pagination
    const lim = Math.min(parseInt(limit || '20') || 20, 100);
    let off: number;
    if (page) {
      const pageNum = Math.max(parseInt(page) || 1, 1);
      off = (pageNum - 1) * lim;
    } else {
      off = parseInt(offset || '0') || 0;
    }
    query = query.range(off, off + lim - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error('content API query error:', error);
      return Response.json({ error: 'Database query failed', code: 'DB_ERROR' }, { status: 500, headers: responseHeaders });
    }

    const articles = (data || []).map((a) => formatArticle(a as ArticleRow, fields));
    const total = count || 0;
    const currentPage = page ? Math.max(parseInt(page) || 1, 1) : Math.floor(off / lim) + 1;

    return Response.json(
      {
        data: articles,
        meta: {
          total,
          page: currentPage,
          limit: lim,
          hasMore: off + lim < total,
        },
        // Legacy compat
        articles,
        pagination: {
          limit: lim,
          offset: off,
          returned: articles.length,
          hasMore: off + lim < total,
        },
      },
      { status: 200, headers: responseHeaders }
    );
  } catch (err) {
    console.error('content API error:', err);
    return Response.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500, headers: responseHeaders });
  }
}
