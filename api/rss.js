const { createClient } = require('@supabase/supabase-js');

/**
 * RSS Feed — /api/rss
 * GET /api/rss                    → all published articles
 * GET /api/rss?workspace=UUID     → specific workspace
 * GET /api/rss?collection=Articles → filter by collection
 * GET /api/rss?limit=20           → limit entries (max 50)
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { workspace, collection, limit } = req.query;
    const siteName = process.env.SITE_NAME || 'Conduit';
    const siteUrl = process.env.SITE_URL || 'https://conduit-woad.vercel.app';
    const lim = Math.min(parseInt(limit) || 20, 50);

    let query = supabase.from('content')
      .select('title, slug, excerpt, meta_desc, body, collection, author, tags, published_at, created_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(lim);

    if (workspace) query = query.eq('workspace_id', workspace);
    if (collection) query = query.eq('collection', collection);

    const { data, error } = await query;
    if (error) return res.status(500).send('Database error');

    const items = (data || []).map(function(a) {
      var desc = (a.excerpt || a.meta_desc || '').replace(/[<>&'"]/g, function(c) {
        return {'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c];
      });
      var title = (a.title || 'Untitled').replace(/[<>&]/g, function(c) {
        return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];
      });
      var pubDate = a.published_at || a.created_at || new Date().toISOString();
      return `    <item>
      <title>${title}</title>
      <link>${siteUrl}/${a.slug || ''}</link>
      <description>${desc}</description>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
      <guid isPermaLink="true">${siteUrl}/${a.slug || ''}</guid>
      ${a.author ? '<dc:creator>' + a.author + '</dc:creator>' : ''}
      ${(a.tags || []).map(t => '<category>' + t + '</category>').join('\n      ')}
    </item>`;
    }).join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName}</title>
    <link>${siteUrl}</link>
    <description>Latest content from ${siteName}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml"/>
    <generator>Conduit CMS</generator>
${items}
  </channel>
</rss>`;

    return res.status(200).send(rss);
  } catch (err) {
    console.error('RSS error:', err);
    return res.status(500).send('Internal server error');
  }
};
