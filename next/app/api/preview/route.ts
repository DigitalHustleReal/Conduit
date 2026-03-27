import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  const responseHeaders = {
    ...corsHeaders,
    'Cache-Control': 'no-store',
  };

  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { searchParams } = new URL(request.url);

    const token = searchParams.get('token') || (request.headers.get('authorization') || '').replace('Bearer ', '');
    if (!token) {
      return Response.json(
        { error: 'Preview requires authentication. Pass ?token=JWT or Authorization header.' },
        { status: 401, headers: responseHeaders }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: responseHeaders });
    }

    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    if (!slug && !id) {
      return Response.json({ error: 'Provide slug or id parameter' }, { status: 400, headers: responseHeaders });
    }

    let query = supabase.from('content').select('*');
    if (slug) query = query.eq('slug', slug);
    else query = query.eq('id', id!);

    const { data, error } = await query.single();
    if (error || !data) {
      return Response.json({ error: 'Content not found' }, { status: 404, headers: responseHeaders });
    }

    // Verify ownership
    const { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).single();
    if (!workspace || data.workspace_id !== workspace.id) {
      return Response.json({ error: 'Not authorized to preview this content' }, { status: 403, headers: responseHeaders });
    }

    return Response.json(
      {
        id: data.id,
        title: data.title,
        slug: data.slug,
        body: data.body,
        excerpt: data.excerpt,
        status: data.status,
        collection: data.collection,
        author: data.author,
        metaTitle: data.meta_title,
        metaDescription: data.meta_desc,
        tags: data.tags || [],
        keyword: data.target_keyword,
        featuredImage: data.featured_image,
        seoScore: data.seo_score,
        aiScore: data.ai_score,
        wordCount: data.word_count,
        publishedAt: data.published_at,
        updatedAt: data.updated_at,
        _preview: true,
        _previewAt: new Date().toISOString(),
      },
      { status: 200, headers: responseHeaders }
    );
  } catch (err) {
    console.error('Preview error:', err);
    return Response.json({ error: 'Preview failed' }, { status: 500, headers: responseHeaders });
  }
}
