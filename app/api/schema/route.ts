import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/ld+json',
    'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
  };

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const type = searchParams.get('type');
    const workspace = searchParams.get('workspace');
    const domain = searchParams.get('domain');

    const rawDomain = domain || process.env.SITE_DOMAIN || 'getconduit.io';
    const siteDomain = rawDomain.replace(/[^a-zA-Z0-9.-]/g, '').slice(0, 100);
    const siteName = process.env.SITE_NAME || 'Conduit';

    // Website schema
    if (type === 'website') {
      return Response.json(
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteName,
          url: `https://${siteDomain}`,
          potentialAction: {
            '@type': 'SearchAction',
            target: `https://${siteDomain}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        { status: 200, headers: responseHeaders }
      );
    }

    // Organization schema
    if (type === 'org') {
      return Response.json(
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: siteName,
          url: `https://${siteDomain}`,
          logo: `https://${siteDomain}/logo.png`,
          sameAs: [],
        },
        { status: 200, headers: responseHeaders }
      );
    }

    // Article schema (requires slug)
    if (!slug) {
      return Response.json(
        { error: 'slug parameter required for article schema' },
        { status: 400, headers: responseHeaders }
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('content')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published');

    if (workspace) query = query.eq('workspace_id', workspace);

    const { data: rows, error } = await query.limit(1);
    const row = rows?.[0] ?? null;
    if (error || !row) {
      return Response.json({ error: 'Article not found' }, { status: 404, headers: responseHeaders });
    }

    // Article schema
    const articleSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: row.title,
      description: row.meta_desc || row.excerpt || '',
      author: { '@type': 'Person', name: row.author || 'Admin' },
      publisher: {
        '@type': 'Organization',
        name: siteName,
        logo: { '@type': 'ImageObject', url: `https://${siteDomain}/logo.png` },
      },
      datePublished: row.published_at || row.created_at,
      dateModified: row.updated_at,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://${siteDomain}/${row.slug}`,
      },
      wordCount: row.word_count || 0,
      keywords: (row.tags || []).join(', '),
    };

    if (row.featured_image) {
      articleSchema.image = row.featured_image;
    }

    // FAQ schema extraction
    if (type === 'faq') {
      const body: string = row.body || '';
      const faqs: Array<{ '@type': string; name: string; acceptedAnswer: { '@type': string; text: string } }> = [];
      // Match Q&A patterns: ### Question?\nAnswer text
      const sections = body.split(/(?=###?\s+)/);
      sections.forEach((section: string) => {
        const lines = section.trim().split('\n');
        if (lines.length >= 2 && lines[0].includes('?')) {
          const question = lines[0].replace(/^#+\s*/, '').trim();
          const answer = lines.slice(1).join(' ').trim();
          if (question && answer) {
            faqs.push({
              '@type': 'Question',
              name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            });
          }
        }
      });

      if (faqs.length >= 1) {
        return Response.json(
          [
            articleSchema,
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.slice(0, 10),
            },
          ],
          { status: 200, headers: responseHeaders }
        );
      }
    }

    // BreadcrumbList
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${siteDomain}` },
        { '@type': 'ListItem', position: 2, name: row.collection || 'Articles', item: `https://${siteDomain}/${(row.collection || 'articles').toLowerCase()}` },
        { '@type': 'ListItem', position: 3, name: row.title },
      ],
    };

    return Response.json([articleSchema, breadcrumb], { status: 200, headers: responseHeaders });
  } catch (err) {
    console.error('schema API error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: responseHeaders });
  }
}
