const { createClient } = require('@supabase/supabase-js');

/**
 * JSON-LD Schema Generator API
 *
 * GET /api/schema?slug=my-article → returns JSON-LD for article
 * GET /api/schema?slug=my-article&type=faq → returns FAQPage schema
 * GET /api/schema?type=website → returns WebSite schema
 * GET /api/schema?type=org → returns Organization schema
 *
 * Embed in your frontend: <script type="application/ld+json">{{ schema }}</script>
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/ld+json');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { slug, type, workspace, domain } = req.query;
    const siteDomain = domain || process.env.SITE_DOMAIN || 'getconduit.io';
    const siteName = process.env.SITE_NAME || 'Conduit';

    // Website schema
    if (type === 'website') {
      return res.status(200).json({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        url: `https://${siteDomain}`,
        potentialAction: {
          '@type': 'SearchAction',
          target: `https://${siteDomain}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      });
    }

    // Organization schema
    if (type === 'org') {
      return res.status(200).json({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteName,
        url: `https://${siteDomain}`,
        logo: `https://${siteDomain}/logo.png`,
        sameAs: [],
      });
    }

    // Article schema (requires slug)
    if (!slug) {
      return res.status(400).json({ error: 'slug parameter required for article schema' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let query = supabase
      .from('content')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (workspace) query = query.eq('workspace_id', workspace);

    const { data: row, error } = await query;
    if (error || !row) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Article schema
    const articleSchema = {
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
      const body = row.body || '';
      const faqs = [];
      // Match Q&A patterns: ### Question?\nAnswer text
      const sections = body.split(/(?=###?\s+)/);
      sections.forEach(section => {
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
        return res.status(200).json([
          articleSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.slice(0, 10),
          },
        ]);
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

    return res.status(200).json([articleSchema, breadcrumb]);
  } catch (err) {
    console.error('schema API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
