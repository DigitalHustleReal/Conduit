'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const SAMPLE_TEMPLATE = 'Best {product} in {city} - Complete {year} Guide';

export default function ProgSEOPage() {
  const { content, deductCredit, addContent } = useWorkspace();
  const [template, setTemplate] = useState(SAMPLE_TEMPLATE);
  const [variables, setVariables] = useState<Record<string, string>>({
    product: 'CRM Software, Project Management Tool, Email Marketing Platform',
    city: 'New York, London, Tokyo, Sydney',
    year: '2026',
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Extract variables from template
  const varNames = [...new Set((template.match(/\{(\w+)\}/g) || []).map((v) => v.slice(1, -1)))];

  // Generate all combinations
  function getCombinations(): Record<string, string>[] {
    const lists = varNames.map((v) =>
      (variables[v] || '').split(',').map((s) => s.trim()).filter(Boolean)
    );
    if (lists.length === 0 || lists.some((l) => l.length === 0)) return [];
    const combos: Record<string, string>[] = [];
    function recurse(idx: number, current: Record<string, string>) {
      if (idx === varNames.length) { combos.push({ ...current }); return; }
      for (const val of lists[idx]) {
        current[varNames[idx]] = val;
        recurse(idx + 1, current);
      }
    }
    recurse(0, {});
    return combos;
  }

  const combos = getCombinations();

  function renderTemplate(vars: Record<string, string>) {
    let result = template;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return result;
  }

  function handleGenerateAll() {
    if (combos.length === 0) return;
    setGenerating(true);
    setProgress(0);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= combos.length) {
        clearInterval(interval);
        setGenerating(false);
        return;
      }
      const title = renderTemplate(combos[i]);
      const ok = deductCredit('aiCalls');
      if (ok) {
        addContent({
          id: Date.now() + i,
          title,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          content: `<h1>${title}</h1><p>AI-generated content for programmatic SEO.</p>`,
          collection: 'Articles',
          status: 'draft',
          tags: ['prog-seo'],
          wordCount: 0,
          aiScore: 0,
          seoScore: 0,
          created: Date.now(),
          updated: Date.now(),
        });
      }
      i++;
      setProgress(Math.round((i / combos.length) * 100));
    }, 200);
  }

  const progContent = content.filter((c) => c.tags?.includes('prog-seo'));

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">SEO Tools</p>
        <h1 className="text-2xl font-bold">Programmatic SEO</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate content at scale using templates and variable substitution.
          {progContent.length > 0 && <Badge variant="outline" className="ml-2 text-[10px]">{progContent.length} generated</Badge>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Builder */}
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Content Template</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Template (use &#123;variable&#125; syntax)
                </label>
                <Input value={template} onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Best {product} in {city} - {year} Guide" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Detected variables: {varNames.map((v) => (
                    <Badge key={v} variant="secondary" className="text-[9px] mx-0.5">{`{${v}}`}</Badge>
                  ))}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Variable Values</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {varNames.map((v) => (
                <div key={v}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block capitalize">{v} (comma-separated)</label>
                  <Input value={variables[v] || ''} onChange={(e) => setVariables({ ...variables, [v]: e.target.value })}
                    placeholder={`Value 1, Value 2, Value 3`} />
                </div>
              ))}
              {varNames.length === 0 && (
                <p className="text-xs text-muted-foreground">Add variables like &#123;keyword&#125; to your template above.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Ready to generate</span>
                <Badge variant="secondary">{combos.length} articles</Badge>
              </div>
              {generating && <Progress value={progress} className="mb-3" />}
              <Button onClick={handleGenerateAll} className="w-full" disabled={combos.length === 0 || generating}>
                {generating ? `Generating... ${progress}%` : `Generate All (${combos.length} articles)`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview + Existing */}
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Preview ({Math.min(combos.length, 8)} of {combos.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {combos.slice(0, 8).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted text-xs">
                    <span className="text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                    <span className="font-medium">{renderTemplate(c)}</span>
                  </div>
                ))}
                {combos.length > 8 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    + {combos.length - 8} more articles
                  </p>
                )}
                {combos.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Add variables and values to see previews
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Existing Programmatic Content</CardTitle></CardHeader>
            <CardContent>
              {progContent.length > 0 ? (
                <div className="space-y-1.5">
                  {progContent.slice(0, 10).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded bg-muted text-xs">
                      <span className="font-medium truncate">{c.title}</span>
                      <Badge variant={c.status === 'published' ? 'default' : 'secondary'} className="text-[9px] shrink-0 ml-2">
                        {c.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No programmatic content yet. Generate your first batch above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
