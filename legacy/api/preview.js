const { createClient } = require('@supabase/supabase-js');

/**
 * Preview API — /api/preview
 * GET /api/preview?slug=my-draft&token=JWT  → preview draft/review content
 * Returns same format as /api/content but allows non-published status
 * Requires valid JWT token (only content owners can preview)
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Preview requires authentication. Pass ?token=JWT or Authorization header.' });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { slug, id } = req.query;
    if (!slug && !id) return res.status(400).json({ error: 'Provide slug or id parameter' });

    var query = supabase.from('content').select('*');
    if (slug) query = query.eq('slug', slug);
    else query = query.eq('id', id);

    const { data, error } = await query.single();
    if (error || !data) return res.status(404).json({ error: 'Content not found' });

    // Verify ownership
    const { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).single();
    if (!workspace || data.workspace_id !== workspace.id) return res.status(403).json({ error: 'Not authorized to preview this content' });

    return res.status(200).json({
      id: data.id, title: data.title, slug: data.slug,
      body: data.body, excerpt: data.excerpt,
      status: data.status, collection: data.collection,
      author: data.author,
      metaTitle: data.meta_title, metaDescription: data.meta_desc,
      tags: data.tags || [], keyword: data.target_keyword,
      featuredImage: data.featured_image,
      seoScore: data.seo_score, aiScore: data.ai_score,
      wordCount: data.word_count,
      publishedAt: data.published_at, updatedAt: data.updated_at,
      _preview: true, _previewAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Preview error:', err);
    return res.status(500).json({ error: 'Preview failed' });
  }
};
