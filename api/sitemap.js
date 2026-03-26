const { createClient } = require('@supabase/supabase-js');

/**
 * Dynamic XML Sitemap Generator
 *
 * GET /api/sitemap → returns sitemap.xml for all published content
 *
 * Query params:
 *   ?workspace=UUID  → specific workspace
 *   ?domain=example.com → override domain
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { workspace, domain } = req.query;
    const siteDomain = domain || process.env.SITE_DOMAIN || 'getconduit.io';

    let query = supabase
      .from('content')
      .select('slug, updated_at, collection')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (workspace) query = query.eq('workspace_id', workspace);

    const { data, error } = await query;
    if (error) {
      return res.status(500).send('Database error');
    }

    const urls = (data || []).map(row => {
      const loc = `https://${siteDomain}/${row.slug || ''}`;
      const lastmod = row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const priority = row.collection === 'Articles' ? '0.8' : '0.6';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${siteDomain}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('sitemap error:', err);
    return res.status(500).send('Internal server error');
  }
};
