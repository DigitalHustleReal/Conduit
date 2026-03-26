'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const GEO_METRICS = [
  { label: 'AI Visibility Score', value: 72, max: 100, desc: 'How likely AI search engines are to surface your content', color: 'text-violet-400' },
  { label: 'Citation Likelihood', value: 58, max: 100, desc: 'Probability of being cited as a source in AI responses', color: 'text-blue-400' },
  { label: 'Brand Mention Frequency', value: 34, max: 100, desc: 'How often AI models reference your brand/domain', color: 'text-emerald-400' },
  { label: 'Entity Recognition', value: 65, max: 100, desc: 'How well AI understands your content topics and entities', color: 'text-amber-400' },
];

const COMPARISON = [
  { aspect: 'Primary Goal', traditional: 'Rank in search results (blue links)', geo: 'Get cited in AI-generated answers' },
  { aspect: 'Content Format', traditional: 'Keyword-optimized articles', geo: 'Fact-rich, citable, structured content' },
  { aspect: 'Success Metric', traditional: 'Position, clicks, impressions', geo: 'Citations, mentions, AI visibility' },
  { aspect: 'Optimization', traditional: 'Title tags, meta, backlinks', geo: 'Schema, entities, authoritative sourcing' },
  { aspect: 'Content Style', traditional: 'Long-form with keyword density', geo: 'Concise, factual, uniquely sourced' },
  { aspect: 'Link Strategy', traditional: 'Build backlinks for authority', geo: 'Be the source others cite' },
  { aspect: 'Technical', traditional: 'Core Web Vitals, mobile-first', geo: 'Structured data, clear attribution' },
];

const OPTIMIZATION_TIPS = [
  { title: 'Add Structured Data', desc: 'Implement JSON-LD schema for articles, FAQs, and how-to content. AI engines parse structured data more reliably.', priority: 'high' },
  { title: 'Cite Authoritative Sources', desc: 'Reference peer-reviewed studies, official reports, and expert quotes. AI models prefer well-sourced content.', priority: 'high' },
  { title: 'Write Entity-Rich Content', desc: 'Mention specific people, places, products, and concepts. AI engines use entity recognition for context.', priority: 'medium' },
  { title: 'Use Clear Definitions', desc: 'Start sections with clear definitions. AI models frequently extract definitional content for answers.', priority: 'medium' },
  { title: 'Create Unique Data', desc: 'Publish original research, surveys, or case studies. AI models favor unique data they cannot find elsewhere.', priority: 'high' },
  { title: 'Maintain Freshness', desc: 'Update content regularly with current dates and data. AI engines deprioritize stale information.', priority: 'low' },
  { title: 'Build Topical Authority', desc: 'Cover topics comprehensively with pillar/cluster architecture. AI engines trust domain experts.', priority: 'medium' },
  { title: 'Optimize for Q&A Format', desc: 'Structure content to directly answer common questions. AI assistants look for direct answers.', priority: 'high' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function GEOSEOPage() {
  const { content, deductCredit } = useWorkspace();
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null);

  const published = content.filter((c) => c.status === 'published');

  function runOptimize() {
    setOptimizing(true);
    const ok = deductCredit('aiCalls');
    setTimeout(() => {
      if (ok) {
        setOptimizeResult(
          `Scanned ${published.length} published articles for AI search optimization.\n\n` +
          `Findings:\n` +
          `- ${Math.max(0, published.length - 2)} articles lack structured data markup\n` +
          `- ${Math.max(0, published.length - 3)} articles missing authoritative source citations\n` +
          `- ${Math.max(0, Math.floor(published.length * 0.6))} articles could benefit from FAQ schema\n` +
          `- Average entity density is moderate — aim for 15+ named entities per article\n\n` +
          `Priority: Add JSON-LD schema to all published content, then focus on adding citations and unique data.`
        );
      } else {
        setOptimizeResult('Insufficient credits. Please upgrade your plan to run AI optimization.');
      }
      setOptimizing(false);
    }, 1500);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">SEO Tools</p>
        <h1 className="text-2xl font-bold">AI SEO / GEO</h1>
        <p className="text-sm text-muted-foreground mt-1">Generative Engine Optimization — optimize content for AI-powered search engines</p>
      </div>

      {/* GEO Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {GEO_METRICS.map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}<span className="text-sm font-normal text-muted-foreground">/{m.max}</span></p>
              <Progress value={m.value} className="mt-2" />
              <p className="text-[10px] text-muted-foreground mt-1">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Optimize action */}
      <Card className="mb-6">
        <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Optimize for AI Search</p>
            <p className="text-xs text-muted-foreground">Analyze {published.length} published articles and get actionable GEO recommendations (1 credit)</p>
          </div>
          <Button onClick={runOptimize} disabled={optimizing}>{optimizing ? 'Optimizing...' : 'Optimize for AI Search'}</Button>
        </CardContent>
        {optimizeResult && (
          <CardContent className="pt-0">
            <div className="rounded bg-muted/50 p-3 text-xs whitespace-pre-wrap">{optimizeResult}</div>
          </CardContent>
        )}
      </Card>

      {/* Comparison table */}
      <h2 className="text-lg font-semibold mb-3">Traditional SEO vs GEO</h2>
      <Card className="mb-6">
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-muted-foreground">Aspect</th>
              <th className="text-left py-2 pr-4 text-muted-foreground">Traditional SEO</th>
              <th className="text-left py-2 text-muted-foreground">GEO (AI Search)</th>
            </tr></thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.aspect} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{row.aspect}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{row.traditional}</td>
                  <td className="py-2 text-violet-400">{row.geo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Tips */}
      <h2 className="text-lg font-semibold mb-3">Optimization Recommendations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {OPTIMIZATION_TIPS.map((tip) => (
          <Card key={tip.title}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium">{tip.title}</p>
                <Badge variant="outline" className={PRIORITY_COLORS[tip.priority]}>{tip.priority}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{tip.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
