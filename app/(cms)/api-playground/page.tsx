'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ENDPOINTS = [
  { path: '/api/content', methods: ['GET', 'POST'], desc: 'List or create content items' },
  { path: '/api/search', methods: ['GET'], desc: 'Full-text search across content' },
  { path: '/api/schema', methods: ['GET'], desc: 'Get collection schemas for headless CMS' },
  { path: '/api/sitemap', methods: ['GET'], desc: 'Generate XML sitemap' },
  { path: '/api/rss', methods: ['GET'], desc: 'Generate RSS feed' },
  { path: '/api/ai-proxy', methods: ['POST'], desc: 'Proxy AI requests with auth and quota' },
];

const SAMPLE_BODIES: Record<string, string> = {
  '/api/content:POST': JSON.stringify({ title: 'My Article', collection: 'Articles', status: 'draft', content: '<p>Hello world</p>' }, null, 2),
  '/api/ai-proxy:POST': JSON.stringify({ prompt: 'Write an SEO-optimized title for an article about React performance', model: 'claude-sonnet-4-20250514', maxTokens: 200 }, null, 2),
};

export default function APIPlaygroundPage() {
  const { settings } = useWorkspace();
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0].path);
  const [method, setMethod] = useState('GET');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<{ status: number; data: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'response' | 'curl' | 'js' | 'python'>('response');

  const endpoint = ENDPOINTS.find((e) => e.path === selectedEndpoint)!;
  const baseUrl = settings.siteDomain || 'https://your-site.conduit.pub';

  function handleEndpointChange(path: string) {
    setSelectedEndpoint(path);
    const ep = ENDPOINTS.find((e) => e.path === path)!;
    setMethod(ep.methods[0]);
    setBody(SAMPLE_BODIES[`${path}:${ep.methods[0]}`] || '');
    setResponse(null);
  }

  function handleMethodChange(m: string) {
    setMethod(m);
    setBody(SAMPLE_BODIES[`${selectedEndpoint}:${m}`] || '');
  }

  function handleSend() {
    setLoading(true);
    setResponse(null);
    // Simulated response
    setTimeout(() => {
      const mockResponses: Record<string, unknown> = {
        '/api/content:GET': { items: [], total: 0, page: 1, limit: 20 },
        '/api/content:POST': { id: Date.now(), title: 'My Article', status: 'draft', created: new Date().toISOString() },
        '/api/search:GET': { results: [], query: '', total: 0 },
        '/api/schema:GET': { collections: [{ name: 'Articles', fields: ['title', 'content', 'slug'] }] },
        '/api/sitemap:GET': '<?xml version="1.0"?><urlset></urlset>',
        '/api/rss:GET': '<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title></channel></rss>',
        '/api/ai-proxy:POST': { result: 'AI response will appear here', tokens: 42, model: 'claude-sonnet-4-20250514' },
      };
      const key = `${selectedEndpoint}:${method}`;
      setResponse({
        status: 200,
        data: JSON.stringify(mockResponses[key] || { message: 'OK' }, null, 2),
      });
      setLoading(false);
    }, 800);
  }

  const curlSnippet = method === 'GET'
    ? `curl -X GET "${baseUrl}${selectedEndpoint}" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`
    : `curl -X POST "${baseUrl}${selectedEndpoint}" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${body || '{}'}'`;

  const jsSnippet = method === 'GET'
    ? `const res = await fetch("${baseUrl}${selectedEndpoint}", {\n  headers: { "Authorization": "Bearer YOUR_API_KEY" }\n});\nconst data = await res.json();`
    : `const res = await fetch("${baseUrl}${selectedEndpoint}", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${body || '{}'})\n});\nconst data = await res.json();`;

  const pySnippet = method === 'GET'
    ? `import requests\n\nres = requests.get(\n    "${baseUrl}${selectedEndpoint}",\n    headers={"Authorization": "Bearer YOUR_API_KEY"}\n)\ndata = res.json()`
    : `import requests\n\nres = requests.post(\n    "${baseUrl}${selectedEndpoint}",\n    headers={"Authorization": "Bearer YOUR_API_KEY"},\n    json=${body || '{}'}\n)\ndata = res.json()`;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Developer</p>
        <h1 className="text-2xl font-bold">API Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">Test API endpoints live and get code snippets.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Request */}
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Request</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Endpoint</label>
                <select value={selectedEndpoint} onChange={(e) => handleEndpointChange(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono">
                  {ENDPOINTS.map((ep) => (
                    <option key={ep.path} value={ep.path}>{ep.path} - {ep.desc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Method</label>
                <div className="flex gap-2">
                  {endpoint.methods.map((m) => (
                    <Button key={m} size="sm" variant={method === m ? 'default' : 'outline'} onClick={() => handleMethodChange(m)}>
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Headers</label>
                <div className="bg-muted rounded-lg p-3 font-mono text-[11px] space-y-1">
                  <div><span className="text-violet-400">Authorization:</span> Bearer YOUR_API_KEY</div>
                  <div><span className="text-violet-400">Content-Type:</span> application/json</div>
                </div>
              </div>
              {method === 'POST' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Request Body</label>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono min-h-[120px] resize-y"
                    placeholder='{ "key": "value" }' />
                </div>
              )}
              <Button onClick={handleSend} className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Request'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Response */}
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Response</CardTitle>
                <div className="flex gap-1">
                  {(['response', 'curl', 'js', 'python'] as const).map((t) => (
                    <Button key={t} size="sm" variant={tab === t ? 'default' : 'ghost'} onClick={() => setTab(t)} className="text-[10px] h-6 px-2 capitalize">
                      {t === 'js' ? 'JavaScript' : t === 'curl' ? 'cURL' : t === 'python' ? 'Python' : 'Response'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tab === 'response' && (
                <>
                  {response ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={response.status < 400 ? 'default' : 'secondary'}
                          className={`text-[10px] ${response.status < 400 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {response.status} {response.status < 400 ? 'OK' : 'Error'}
                        </Badge>
                      </div>
                      <pre className="bg-muted rounded-lg p-4 font-mono text-[11px] overflow-auto max-h-[400px] whitespace-pre-wrap">
                        {response.data}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-3xl mb-2">&#x1f9ea;</p>
                      <p className="text-sm">Send a request to see the response</p>
                    </div>
                  )}
                </>
              )}
              {tab === 'curl' && (
                <pre className="bg-muted rounded-lg p-4 font-mono text-[11px] overflow-auto max-h-[400px] whitespace-pre-wrap">{curlSnippet}</pre>
              )}
              {tab === 'js' && (
                <pre className="bg-muted rounded-lg p-4 font-mono text-[11px] overflow-auto max-h-[400px] whitespace-pre-wrap">{jsSnippet}</pre>
              )}
              {tab === 'python' && (
                <pre className="bg-muted rounded-lg p-4 font-mono text-[11px] overflow-auto max-h-[400px] whitespace-pre-wrap">{pySnippet}</pre>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
