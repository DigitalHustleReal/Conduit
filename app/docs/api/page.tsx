'use client';

import Link from 'next/link';
import { useState } from 'react';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/content',
    description: 'List and filter content items from your workspace.',
    params: [
      { name: 'workspace', type: 'string', required: true, desc: 'Workspace ID' },
      { name: 'collection', type: 'string', required: false, desc: 'Filter by collection slug' },
      { name: 'status', type: 'string', required: false, desc: 'Filter by status: draft, review, published' },
      { name: 'page', type: 'number', required: false, desc: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', required: false, desc: 'Items per page (default: 20, max: 100)' },
      { name: 'sort', type: 'string', required: false, desc: 'Sort field: created, updated, title' },
      { name: 'q', type: 'string', required: false, desc: 'Full-text search query' },
      { name: 'slug', type: 'string', required: false, desc: 'Get single item by slug' },
      { name: 'fields', type: 'string', required: false, desc: 'Comma-separated field names to return' },
    ],
    curl: `curl -X GET "https://getconduit.io/api/content?workspace=ws_abc123&limit=10" \\
  -H "X-API-Key: your-api-key"`,
    js: `const res = await fetch(
  "https://getconduit.io/api/content?workspace=ws_abc123&limit=10",
  { headers: { "X-API-Key": "your-api-key" } }
);
const data = await res.json();`,
    python: `import requests

res = requests.get(
    "https://getconduit.io/api/content",
    params={"workspace": "ws_abc123", "limit": 10},
    headers={"X-API-Key": "your-api-key"}
)
data = res.json()`,
    response: `{
  "data": [
    {
      "id": "cnt_xyz789",
      "title": "How to Build an AI Content Pipeline",
      "slug": "ai-content-pipeline",
      "status": "published",
      "collection": "blog",
      "created_at": "2026-03-15T10:30:00Z",
      "updated_at": "2026-03-20T14:22:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10
}`,
  },
  {
    method: 'GET',
    path: '/api/rss',
    description: 'Generate an RSS 2.0 feed for published content.',
    params: [
      { name: 'workspace', type: 'string', required: true, desc: 'Workspace ID' },
      { name: 'collection', type: 'string', required: false, desc: 'Filter by collection' },
      { name: 'limit', type: 'number', required: false, desc: 'Number of items (default: 20)' },
    ],
    curl: `curl "https://getconduit.io/api/rss?workspace=ws_abc123"`,
    js: `const res = await fetch(
  "https://getconduit.io/api/rss?workspace=ws_abc123"
);
const xml = await res.text();`,
    python: `import requests

res = requests.get(
    "https://getconduit.io/api/rss",
    params={"workspace": "ws_abc123"}
)
xml = res.text`,
    response: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>My Blog</title>
    <item>
      <title>How to Build an AI Content Pipeline</title>
      <link>https://example.com/ai-content-pipeline</link>
      <pubDate>Wed, 20 Mar 2026 14:22:00 GMT</pubDate>
    </item>
  </channel>
</rss>`,
  },
  {
    method: 'GET',
    path: '/api/sitemap',
    description: 'Generate an XML sitemap for all published content.',
    params: [
      { name: 'workspace', type: 'string', required: true, desc: 'Workspace ID' },
      { name: 'baseUrl', type: 'string', required: false, desc: 'Base URL for sitemap links' },
    ],
    curl: `curl "https://getconduit.io/api/sitemap?workspace=ws_abc123&baseUrl=https://example.com"`,
    js: `const res = await fetch(
  "https://getconduit.io/api/sitemap?workspace=ws_abc123&baseUrl=https://example.com"
);
const xml = await res.text();`,
    python: `import requests

res = requests.get(
    "https://getconduit.io/api/sitemap",
    params={"workspace": "ws_abc123", "baseUrl": "https://example.com"}
)
xml = res.text`,
    response: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/ai-content-pipeline</loc>
    <lastmod>2026-03-20</lastmod>
  </url>
</urlset>`,
  },
  {
    method: 'GET',
    path: '/api/schema',
    description: 'Generate JSON-LD structured data (schema.org) for content items.',
    params: [
      { name: 'workspace', type: 'string', required: true, desc: 'Workspace ID' },
      { name: 'slug', type: 'string', required: true, desc: 'Content item slug' },
      { name: 'type', type: 'string', required: false, desc: 'Schema type: Article, BlogPosting, FAQPage' },
    ],
    curl: `curl "https://getconduit.io/api/schema?workspace=ws_abc123&slug=ai-content-pipeline"`,
    js: `const res = await fetch(
  "https://getconduit.io/api/schema?workspace=ws_abc123&slug=ai-content-pipeline"
);
const schema = await res.json();`,
    python: `import requests

res = requests.get(
    "https://getconduit.io/api/schema",
    params={"workspace": "ws_abc123", "slug": "ai-content-pipeline"}
)
schema = res.json()`,
    response: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Build an AI Content Pipeline",
  "datePublished": "2026-03-15T10:30:00Z",
  "dateModified": "2026-03-20T14:22:00Z"
}`,
  },
  {
    method: 'GET',
    path: '/api/search',
    description: 'Full-text search across all content in a workspace.',
    params: [
      { name: 'workspace', type: 'string', required: true, desc: 'Workspace ID' },
      { name: 'q', type: 'string', required: true, desc: 'Search query' },
      { name: 'limit', type: 'number', required: false, desc: 'Max results (default: 10)' },
    ],
    curl: `curl "https://getconduit.io/api/search?workspace=ws_abc123&q=AI+agents"`,
    js: `const res = await fetch(
  "https://getconduit.io/api/search?workspace=ws_abc123&q=AI+agents"
);
const results = await res.json();`,
    python: `import requests

res = requests.get(
    "https://getconduit.io/api/search",
    params={"workspace": "ws_abc123", "q": "AI agents"}
)
results = res.json()`,
    response: `{
  "results": [
    {
      "id": "cnt_xyz789",
      "title": "How to Build an AI Content Pipeline",
      "snippet": "...using autonomous AI agents to handle...",
      "score": 0.95
    }
  ],
  "total": 3
}`,
  },
  {
    method: 'GET',
    path: '/api/export',
    description: 'Export workspace data in JSON, CSV, or Markdown format.',
    params: [
      { name: 'workspace', type: 'string', required: true, desc: 'Workspace ID' },
      { name: 'format', type: 'string', required: false, desc: 'Export format: json, csv, markdown (default: json)' },
      { name: 'collection', type: 'string', required: false, desc: 'Filter by collection' },
    ],
    curl: `curl "https://getconduit.io/api/export?workspace=ws_abc123&format=json" \\
  -H "X-API-Key: your-api-key"`,
    js: `const res = await fetch(
  "https://getconduit.io/api/export?workspace=ws_abc123&format=json",
  { headers: { "X-API-Key": "your-api-key" } }
);
const data = await res.json();`,
    python: `import requests

res = requests.get(
    "https://getconduit.io/api/export",
    params={"workspace": "ws_abc123", "format": "json"},
    headers={"X-API-Key": "your-api-key"}
)
data = res.json()`,
    response: `{
  "workspace": "ws_abc123",
  "exported_at": "2026-03-27T12:00:00Z",
  "content": [...],
  "collections": [...],
  "keywords": [...]
}`,
  },
  {
    method: 'POST',
    path: '/api/notify',
    description: 'Send a webhook notification to registered endpoints.',
    params: [
      { name: 'workspace', type: 'string', required: true, desc: 'Workspace ID (in body)' },
      { name: 'event', type: 'string', required: true, desc: 'Event type: content.published, content.updated, etc.' },
      { name: 'payload', type: 'object', required: false, desc: 'Custom payload data' },
    ],
    curl: `curl -X POST "https://getconduit.io/api/notify" \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"workspace":"ws_abc123","event":"content.published","payload":{"id":"cnt_xyz789"}}'`,
    js: `const res = await fetch("https://getconduit.io/api/notify", {
  method: "POST",
  headers: {
    "X-API-Key": "your-api-key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    workspace: "ws_abc123",
    event: "content.published",
    payload: { id: "cnt_xyz789" }
  })
});`,
    python: `import requests

res = requests.post(
    "https://getconduit.io/api/notify",
    headers={"X-API-Key": "your-api-key"},
    json={
        "workspace": "ws_abc123",
        "event": "content.published",
        "payload": {"id": "cnt_xyz789"}
    }
)`,
    response: `{
  "ok": true,
  "delivered": 2,
  "failed": 0
}`,
  },
  {
    method: 'POST',
    path: '/api/ai-proxy',
    description: 'Proxy AI requests through Conduit with credit tracking. Requires authentication.',
    params: [
      { name: 'prompt', type: 'string', required: true, desc: 'The prompt to send to the AI provider' },
      { name: 'provider', type: 'string', required: false, desc: 'AI provider: anthropic, openai, google, mistral, groq' },
      { name: 'model', type: 'string', required: false, desc: 'Specific model ID' },
      { name: 'max_tokens', type: 'number', required: false, desc: 'Max tokens in response (default: 1024)' },
    ],
    curl: `curl -X POST "https://getconduit.io/api/ai-proxy" \\
  -H "Authorization: Bearer your-jwt-token" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Write a blog intro about AI agents","provider":"anthropic"}'`,
    js: `const res = await fetch("https://getconduit.io/api/ai-proxy", {
  method: "POST",
  headers: {
    Authorization: "Bearer your-jwt-token",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    prompt: "Write a blog intro about AI agents",
    provider: "anthropic"
  })
});
const data = await res.json();`,
    python: `import requests

res = requests.post(
    "https://getconduit.io/api/ai-proxy",
    headers={"Authorization": "Bearer your-jwt-token"},
    json={
        "prompt": "Write a blog intro about AI agents",
        "provider": "anthropic"
    }
)
data = res.json()`,
    response: `{
  "text": "In the evolving landscape of content creation...",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "tokens_used": 287,
  "credits_remaining": 713
}`,
  },
];

function MethodBadge({ method }: { method: string }) {
  const color = method === 'GET'
    ? 'bg-green-500/15 text-green-400 border-green-500/30'
    : 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded border ${color}`}>
      {method}
    </span>
  );
}

function CodeTabs({ curl, js, python }: { curl: string; js: string; python: string }) {
  const [tab, setTab] = useState<'curl' | 'js' | 'python'>('curl');
  const code = { curl, js, python }[tab];
  const labels = { curl: 'cURL', js: 'JavaScript', python: 'Python' } as const;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex border-b border-border bg-muted/50">
        {(['curl', 'js', 'python'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? 'text-foreground border-b-2 border-primary bg-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {labels[t]}
          </button>
        ))}
      </div>
      <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed bg-card">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold tracking-tight">Conduit</Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
          </div>
          <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; All docs</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black mb-3">API Reference</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Use the Conduit REST API to integrate content into any frontend. All endpoints return JSON unless otherwise noted.
        </p>

        {/* Authentication */}
        <section className="mb-12 border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-3">Authentication</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Most endpoints require an API key passed via the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">X-API-Key</code> header. The AI proxy endpoint requires a JWT Bearer token. You can generate API keys from Settings in your Conduit dashboard.
          </p>
          <pre className="bg-card border border-border rounded-lg p-4 text-xs font-mono text-muted-foreground overflow-x-auto">
            <code>{`# API Key authentication
curl -H "X-API-Key: your-api-key" https://getconduit.io/api/content

# JWT authentication (AI proxy only)
curl -H "Authorization: Bearer your-jwt-token" https://getconduit.io/api/ai-proxy`}</code>
          </pre>
        </section>

        {/* Endpoints */}
        <div className="space-y-16">
          {ENDPOINTS.map((ep) => (
            <section key={ep.path} id={ep.path.replace(/\//g, '-').slice(1)}>
              <div className="flex items-center gap-3 mb-3">
                <MethodBadge method={ep.method} />
                <code className="text-base font-mono font-bold">{ep.path}</code>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">{ep.description}</p>

              {/* Parameters */}
              <div className="border border-border rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">Parameter</th>
                      <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">Required</th>
                      <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.params.map((p) => (
                      <tr key={p.name} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 font-mono text-xs">{p.name}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{p.type}</td>
                        <td className="px-4 py-2 text-xs">{p.required ? <span className="text-primary font-medium">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Request example */}
              <h4 className="text-sm font-semibold mb-2">Request</h4>
              <CodeTabs curl={ep.curl} js={ep.js} python={ep.python} />

              {/* Response example */}
              <h4 className="text-sm font-semibold mt-4 mb-2">Response</h4>
              <pre className="bg-card border border-border rounded-lg p-4 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed">
                <code>{ep.response}</code>
              </pre>
            </section>
          ))}
        </div>

        {/* Rate limits */}
        <section className="mt-16 border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-3">Rate Limits</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            API requests are rate-limited per workspace. Free plans: 100 requests/hour. Pro plans: 1,000 requests/hour. Business plans: 10,000 requests/hour. Rate limit headers are included in every response: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">X-RateLimit-Remaining</code> and <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">X-RateLimit-Reset</code>.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; 2026 Conduit by DigitalHustle</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
