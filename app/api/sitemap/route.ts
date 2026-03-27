import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace');
    const domain = searchParams.get('domain');

    const rawDomain = domain || process.env.SITE_DOMAIN || 'getconduit.io';
    const siteDomain = rawDomain.replace(/[^a-zA-Z0-9.-]/g, '').slice(0, 100);

    let query = supabase
      .from('content')
      .select('slug, updated_at, collection')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (workspace) query = query.eq('workspace_id', workspace);

    const { data, error } = await query;
    if (error) {
      return new Response('Database error', { status: 500, headers: { 'Content-Type': 'application/xml' } });
    }

    const urls = (data || []).map((row) => {
      const loc = `https://${siteDomain}/${row.slug || ''}`;
      const lastmod = row.updated_at
        ? new Date(row.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
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

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('sitemap error:', err);
    return new Response('Internal server error', { status: 500, headers: { 'Content-Type': 'application/xml' } });
  }
}
