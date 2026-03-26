'use client';

import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export default function DashboardPage() {
  const { content, keywords, pipeline, credits, pricingPlan, agents, autopilot, siteName } = useWorkspace();

  const published = content.filter((c) => c.status === 'published');
  const drafts = content.filter((c) => c.status === 'draft');
  const review = content.filter((c) => c.status === 'review');
  const avgSEO = published.length ? Math.round(published.reduce((a, c) => a + (c.seoScore || 0), 0) / published.length) : 0;
  const avgAI = published.length ? Math.round(published.reduce((a, c) => a + (c.aiScore || 0), 0) / published.length) : 0;
  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;
  const creditPct = Math.min((credits.aiCalls / limits.aiCalls) * 100, 100);
  const activeAgents = Object.values(agents.registry).filter((a) => a.enabled).length;

  const metrics = [
    { label: 'Published', value: published.length, icon: '📄', color: 'text-emerald-400' },
    { label: 'Drafts', value: drafts.length, icon: '📝', color: 'text-amber-400' },
    { label: 'In Review', value: review.length, icon: '👁', color: 'text-blue-400' },
    { label: 'Keywords', value: keywords.length, icon: '🔑', color: 'text-violet-400' },
    { label: 'Avg SEO', value: avgSEO, icon: '🔍', color: avgSEO >= 70 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Avg AI Quality', value: avgAI, icon: '✦', color: avgAI >= 70 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Active Agents', value: activeAgents, icon: '🤖', color: activeAgents > 0 ? 'text-emerald-400' : 'text-muted-foreground' },
    { label: 'AI Credits', value: `${credits.aiCalls}/${limits.aiCalls}`, icon: '🔮', color: creditPct >= 80 ? 'text-red-400' : 'text-violet-400' },
  ];

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Overview</p>
        <h1 className="text-2xl font-bold">{siteName} Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {content.length} articles · {keywords.length} keywords · {activeAgents} agents active
          {autopilot.enabled && <Badge variant="outline" className="ml-2 text-emerald-400 border-emerald-400/30">Autopilot ON</Badge>}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {metrics.map((m) => (
          <Card key={m.label} className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{m.icon}</span>
              </div>
              <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
              <div className="text-xs text-muted-foreground">{m.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Link href="/editor/new">
          <Card className="bg-card hover:border-violet-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-lg">✦</div>
              <div>
                <div className="font-semibold text-sm">New Article</div>
                <div className="text-xs text-muted-foreground">Create with AI assistance</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/agents">
          <Card className="bg-card hover:border-emerald-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-lg">🤖</div>
              <div>
                <div className="font-semibold text-sm">AI Agents</div>
                <div className="text-xs text-muted-foreground">141 agents ready</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/seo">
          <Card className="bg-card hover:border-cyan-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-lg">🔍</div>
              <div>
                <div className="font-semibold text-sm">SEO Center</div>
                <div className="text-xs text-muted-foreground">Track rankings & scores</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Content */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Recent Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {content.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/editor/${c.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Badge variant={c.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                    {c.status}
                  </Badge>
                  <span className="text-sm font-medium">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{c.collection}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>AI: {c.aiScore || 0}</span>
                  <span>SEO: {c.seoScore || 0}</span>
                  <span>{(c.wordCount || 0).toLocaleString()}w</span>
                </div>
              </Link>
            ))}
            {content.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg mb-2">No content yet</p>
                <Link href="/editor/new" className="text-violet-400 hover:underline text-sm">Create your first article →</Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
