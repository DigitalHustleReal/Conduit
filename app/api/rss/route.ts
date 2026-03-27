import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).replace(/[<>&'"]/g, (c: string) => {
    const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
    return map[c] || c;
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
  };

  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const workspace = searchParams.get('workspace');
    const workspace_id = searchParams.get('workspace_id');
    const collection = searchParams.get('collection');
    const limit = searchParams.get('limit');
    const tag = searchParams.get('tag');

    const wsId = workspace || workspace_id;
    const siteName = process.env.SITE_NAME || 'Conduit';
    const siteUrl = process.env.SITE_URL || 'https://conduit-woad.vercel.app';
    const lim = Math.min(parseInt(limit || '20') || 20, 50);

    let query = supabase.from('content')
      .select('title, slug, excerpt, meta_desc, body, collection, author, tags, published_at, created_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(lim);

    if (wsId) query = query.eq('workspace_id', wsId);
    if (collection) query = query.eq('collection', collection);
    if (tag) query = query.contains('tags', [tag]);

    const { data, error } = await query;
    if (error) {
      return new Response('Database error', { status: 500, headers: responseHeaders });
    }

    const items = (data || []).map((a) => {
      const desc = escapeXml(a.excerpt || a.meta_desc || '');
      const title = escapeXml(a.title || 'Untitled');
      const pubDate = a.published_at || a.created_at || new Date().toISOString();
      return `    <item>
      <title>${title}</title>
      <link>${siteUrl}/${a.slug || ''}</link>
      <description>${desc}</description>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
      <guid isPermaLink="true">${siteUrl}/${a.slug || ''}</guid>
      ${a.author ? '<dc:creator>' + escapeXml(a.author) + '</dc:creator>' : ''}
      ${(a.tags || []).map((t: string) => '<category>' + escapeXml(t) + '</category>').join('\n      ')}
    </item>`;
    }).join('\n');

    let rssUrl = siteUrl + '/api/rss';
    if (wsId) rssUrl += '?workspace=' + wsId;

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}</link>
    <description>Latest content from ${escapeXml(siteName)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${rssUrl}" rel="self" type="application/rss+xml"/>
    <generator>Conduit CMS</generator>
    <ttl>5</ttl>
${items}
  </channel>
</rss>`;

    return new Response(rss, { status: 200, headers: responseHeaders });
  } catch (err) {
    console.error('RSS error:', err);
    return new Response('Internal server error', { status: 500, headers: responseHeaders });
  }
}
