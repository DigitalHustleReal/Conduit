# Conduit Headless CMS — Integration Guide

Connect any frontend to Conduit's content API. This guide covers API endpoints, authentication, the TypeScript SDK, webhook-driven ISR, and a complete investingpro.in integration example.

---

## API Endpoints

All endpoints are served from your Conduit deployment (e.g. `https://conduit-woad.vercel.app`).

### GET /api/content — List & query content

| Parameter    | Type   | Default     | Description                              |
|-------------|--------|-------------|------------------------------------------|
| workspace   | UUID   | —           | Filter by workspace (required for multi-tenant) |
| slug        | string | —           | Fetch a single article by slug           |
| collection  | string | —           | Filter by collection name                |
| page        | number | 1           | Page number (1-indexed)                  |
| limit       | number | 20          | Items per page (max 100)                 |
| sort        | string | created_at  | Sort field: created_at, updated_at, published_at, seo_score, title |
| order       | string | desc        | Sort order: asc or desc                  |
| q           | string | —           | Full-text search across title and body   |
| tag         | string | —           | Filter by tag                            |
| keyword     | string | —           | Filter by target keyword                 |
| fields      | string | —           | Comma-separated field names to return    |
| schema      | bool   | false       | Include JSON-LD schema markup            |
| status      | string | published   | Content status filter                    |

**Response (list):**
```json
{
  "data": [{ "id": 1, "title": "...", "slug": "...", ... }],
  "meta": { "total": 42, "page": 1, "limit": 20, "hasMore": true }
}
```

**Response (single, with `?slug=my-article`):**
```json
{
  "data": { "id": 1, "title": "...", "slug": "my-article", "body": "...", ... }
}
```

### GET /api/rss — RSS 2.0 feed

| Parameter    | Type   | Description                  |
|-------------|--------|------------------------------|
| workspace   | UUID   | Filter by workspace          |
| collection  | string | Filter by collection         |
| limit       | number | Max items (default 20, max 50) |
| tag         | string | Filter by tag                |

Returns `application/rss+xml` with Cache-Control headers.

### POST /api/notify — Trigger webhooks

Called internally when content is published. Fires all registered webhooks for the workspace.

**Body:**
```json
{
  "event": "content.published",
  "slug": "my-new-article",
  "workspace_id": "uuid"
}
```

Each webhook receives a POST with:
- `X-Conduit-Signature` header: HMAC-SHA256 of the body
- `X-Conduit-Event` header: event type
- Body: `{ event, slug, content, timestamp, data }`

### POST /api/revalidate — ISR revalidation (Next.js)

This endpoint lives in your Next.js frontend (e.g. investingpro.in).

**Headers:**
- `X-Conduit-Signature`: HMAC-SHA256 signature for verification

**Body:** Same as webhook payload from Conduit.

**Response:**
```json
{ "revalidated": true, "paths": ["/my-article", "/"], "timestamp": "..." }
```

---

## Authentication

For public content (published articles), no authentication is required. For draft content or workspace-specific queries, pass an API key:

```
X-API-Key: your-api-key
```

Set this in your Conduit workspace settings, then pass it in the SDK constructor or request headers.

---

## TypeScript SDK

Install the SDK by importing from `@/lib/headless-client`:

```typescript
import { ConduitClient, createConduitClient } from '@/lib/headless-client';
```

### Option 1: Manual configuration

```typescript
const conduit = new ConduitClient(
  'https://conduit-woad.vercel.app',
  'your-workspace-uuid',
  'optional-api-key'
);
```

### Option 2: From environment variables

```env
CONDUIT_API_URL=https://conduit-woad.vercel.app
CONDUIT_WORKSPACE_ID=your-workspace-uuid
CONDUIT_API_KEY=optional-api-key
CONDUIT_WEBHOOK_SECRET=your-hmac-secret
```

```typescript
const conduit = createConduitClient();
```

### SDK Methods

```typescript
// List content with filters
const { data, meta } = await conduit.getContent({
  collection: 'Articles',
  page: 1,
  limit: 10,
  sort: 'published_at',
  order: 'desc',
  q: 'investing',
});

// Single article
const article = await conduit.getContentBySlug('best-stocks-2026');

// Collections
const collections = await conduit.getCollections();

// Keywords
const keywords = await conduit.getKeywords();

// Sitemap entries (paginated fetch of all slugs)
const sitemap = await conduit.getSitemap();

// JSON-LD schema
const schema = await conduit.getSchema('best-stocks-2026', 'BlogPosting');

// RSS feed
const rssXml = await conduit.getRSS('Articles');
```

---

## Next.js Integration with ISR

### Static generation with revalidation

```typescript
// app/[slug]/page.tsx
import { createConduitClient } from '@/lib/headless-client';

const conduit = createConduitClient();

export async function generateStaticParams() {
  const sitemap = await conduit.getSitemap();
  return sitemap.map((entry) => ({ slug: entry.slug }));
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await conduit.getContentBySlug(params.slug);
  if (!article) return notFound();

  return (
    <article>
      <h1>{article.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: article.body || '' }} />
    </article>
  );
}
```

### Listing page with pagination

```typescript
// app/articles/page.tsx
import { createConduitClient } from '@/lib/headless-client';

const conduit = createConduitClient();

export default async function ArticlesPage({ searchParams }) {
  const page = Number(searchParams?.page) || 1;
  const { data: articles, meta } = await conduit.getContent({
    collection: 'Articles',
    page,
    limit: 12,
    sort: 'published_at',
    order: 'desc',
  });

  return (
    <div>
      {articles.map((a) => (
        <a key={a.slug} href={`/${a.slug}`}>{a.title}</a>
      ))}
      {meta.hasMore && <a href={`?page=${page + 1}`}>Next</a>}
    </div>
  );
}
```

---

## investingpro.in Specific Setup

### 1. Environment variables

Add to `.env.local` on investingpro.in:

```env
CONDUIT_API_URL=https://conduit-woad.vercel.app
CONDUIT_WORKSPACE_ID=<your-workspace-uuid>
CONDUIT_API_KEY=<optional>
CONDUIT_WEBHOOK_SECRET=<shared-secret-for-hmac>
```

### 2. Register the webhook in Conduit

In Conduit CMS, go to **Webhooks** and add:

- **URL:** `https://investingpro.in/api/revalidate`
- **Events:** `content.published`, `content.updated`, `content.deleted`
- **Secret:** Same value as `CONDUIT_WEBHOOK_SECRET`

### 3. Deploy the revalidation endpoint

The file `app/api/revalidate/route.ts` handles incoming webhooks and triggers ISR. It verifies the HMAC signature and calls `revalidatePath()` / `revalidateTag()`.

### 4. Content flow

1. Author publishes article in Conduit CMS
2. Conduit calls `/api/notify` internally
3. Notify fires webhook to `https://investingpro.in/api/revalidate`
4. Revalidate endpoint verifies signature and regenerates the page
5. Next visit to the page serves fresh static HTML

---

## Webhook Security

All webhooks include an HMAC-SHA256 signature. To verify:

```typescript
import crypto from 'crypto';

function verifyConduitWebhook(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

---

## Rate Limits & Caching

| Endpoint       | Cache-Control                                     |
|---------------|---------------------------------------------------|
| /api/content  | `s-maxage=60, stale-while-revalidate=300`         |
| /api/rss      | `s-maxage=300, stale-while-revalidate=600`        |

- CDN caching is enabled via `s-maxage` headers (Vercel Edge, Cloudflare, etc.)
- `stale-while-revalidate` serves stale content while refreshing in the background
- No explicit rate limits on the API, but Supabase connection pooling applies
- For high traffic, increase `s-maxage` or add a caching proxy

---

## Sitemap Generation

```typescript
// app/sitemap.ts
import { createConduitClient } from '@/lib/headless-client';

export default async function sitemap() {
  const conduit = createConduitClient();
  const entries = await conduit.getSitemap();

  return entries.map((entry) => ({
    url: `https://investingpro.in/${entry.slug}`,
    lastModified: new Date(entry.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
}
```

---

## Error Handling

The SDK throws `ConduitError` with status code and response body:

```typescript
import { ConduitError } from '@/lib/headless-client';

try {
  const article = await conduit.getContentBySlug('nonexistent');
} catch (err) {
  if (err instanceof ConduitError) {
    console.error(`API ${err.status}: ${err.message}`);
  }
}
```

All API endpoints return errors in this format:

```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```
