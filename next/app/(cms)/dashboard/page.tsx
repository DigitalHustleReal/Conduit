'use client';

import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

const AGENT_NAMES: Record<string, string> = {
  contentAutopilot: 'Content Autopilot',
  seoGuardian: 'SEO Guardian',
  keywordOpportunity: 'Keyword Opportunity',
  publishingPipeline: 'Pipeline Manager',
  smartOnboarding: 'Smart Onboarding',
  healthMonitor: 'Health Monitor',
  contentRefresh: 'Content Refresh',
  interlinkBuilder: 'Interlink Builder',
};

export default function DashboardPage() {
  const { content, keywords, pipeline, credits, pricingPlan, agents, autopilot, siteName, settings } = useWorkspace();

  const published = content.filter((c) => c.status === 'published');
  const drafts = content.filter((c) => c.status === 'draft');
  const review = content.filter((c) => c.status === 'review');
  const avgSEO = published.length ? Math.round(published.reduce((a, c) => a + (c.seoScore || 0), 0) / published.length) : 0;
  const avgAI = published.length ? Math.round(published.reduce((a, c) => a + (c.aiScore || 0), 0) / published.length) : 0;
  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;
  const creditPct = Math.min((credits.aiCalls / limits.aiCalls) * 100, 100);
  const activeAgents = Object.values(agents.registry).filter((a) => a.enabled).length;

  const metrics = [
    { label: 'Published', value: published.length, icon: '&#x1f4c4;', color: 'text-emerald-400' },
    { label: 'Drafts', value: drafts.length, icon: '&#x1f4dd;', color: 'text-amber-400' },
    { label: 'In Review', value: review.length, icon: '&#x1f441;', color: 'text-blue-400' },
    { label: 'Keywords', value: keywords.length, icon: '&#x1f511;', color: 'text-violet-400' },
    { label: 'Avg SEO', value: avgSEO, icon: '&#x1f50d;', color: avgSEO >= 70 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Avg AI Quality', value: avgAI, icon: '&#x2726;', color: avgAI >= 70 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Active Agents', value: activeAgents, icon: '&#x1f916;', color: activeAgents > 0 ? 'text-emerald-400' : 'text-muted-foreground' },
    { label: 'AI Credits', value: `${credits.aiCalls}/${limits.aiCalls}`, icon: '&#x1f52e;', color: creditPct >= 80 ? 'text-red-400' : 'text-violet-400' },
  ];

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Overview</p>
        <h1 className="text-2xl font-bold">{siteName} Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {content.length} articles &middot; {keywords.length} keywords &middot; {activeAgents} agents active
          {autopilot.enabled && <Badge variant="outline" className="ml-2 text-emerald-400 border-emerald-400/30">Autopilot ON</Badge>}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {metrics.map((m) => (
          <Card key={m.label} className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg" dangerouslySetInnerHTML={{ __html: m.icon }} />
              </div>
              <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
              <div className="text-xs text-muted-foreground">{m.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Link href="/editor/new">
          <Card className="bg-card hover:border-violet-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-lg">&#x2726;</div>
              <div>
                <div className="font-semibold text-sm">New Article</div>
                <div className="text-xs text-muted-foreground">Create with AI</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ai-studio">
          <Card className="bg-card hover:border-pink-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-lg">&#x1f9e0;</div>
              <div>
                <div className="font-semibold text-sm">AI Studio</div>
                <div className="text-xs text-muted-foreground">21 AI tools</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/agents">
          <Card className="bg-card hover:border-emerald-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-lg">&#x1f916;</div>
              <div>
                <div className="font-semibold text-sm">AI Agents</div>
                <div className="text-xs text-muted-foreground">{activeAgents} active</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/seo">
          <Card className="bg-card hover:border-cyan-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-lg">&#x1f50d;</div>
              <div>
                <div className="font-semibold text-sm">SEO Center</div>
                <div className="text-xs text-muted-foreground">Avg score: {avgSEO}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Autopilot Status */}
        <Card className={`bg-card ${autopilot.enabled ? 'border-emerald-500/30' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Autopilot</CardTitle>
              <Badge variant={autopilot.enabled ? 'default' : 'secondary'} className={`text-[10px] ${autopilot.enabled ? 'bg-emerald-500/20 text-emerald-400' : ''}`}>
                {autopilot.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily budget</span>
                <span className="font-mono">{autopilot.creditBudget.daily} credits</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used today</span>
                <span className="font-mono">{autopilot.creditBudget.used_today}</span>
              </div>
              <Progress value={(autopilot.creditBudget.used_today / autopilot.creditBudget.daily) * 100} className="h-1.5" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total runs</span>
                <span className="font-mono">{autopilot.stats.total_runs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Articles created</span>
                <span className="font-mono">{autopilot.stats.articles_created}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issues fixed</span>
                <span className="font-mono">{autopilot.stats.issues_fixed}</span>
              </div>
            </div>
            <Link href="/agents"><Button size="sm" variant="outline" className="w-full mt-3 text-xs">Manage Autopilot</Button></Link>
          </CardContent>
        </Card>

        {/* Agent Status */}
        <Card className="bg-card">
          <CardHeader><CardTitle className="text-sm">Agent Status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {Object.entries(agents.registry).map(([id, agent]) => (
                <div key={id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${agent.enabled ? (agent.running ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400') : 'bg-zinc-600'}`} />
                    <span className={agent.enabled ? 'text-foreground' : 'text-muted-foreground'}>{AGENT_NAMES[id] || id}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {agent.lastRun ? `${Math.round((Date.now() - agent.lastRun) / 60000)}m ago` : 'Never'}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/agents"><Button size="sm" variant="outline" className="w-full mt-3 text-xs">View All Agents</Button></Link>
          </CardContent>
        </Card>

        {/* Credit Usage */}
        <Card className="bg-card">
          <CardHeader><CardTitle className="text-sm">Credit Usage</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">AI Calls</span>
                  <span className="font-mono">{credits.aiCalls} / {limits.aiCalls}</span>
                </div>
                <Progress value={creditPct} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Storage</span>
                  <span className="font-mono">{credits.storage} / {limits.storage} MB</span>
                </div>
                <Progress value={(credits.storage / limits.storage) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">API Requests</span>
                  <span className="font-mono">{credits.apiReqs} / {limits.apiReqs}</span>
                </div>
                <Progress value={(credits.apiReqs / limits.apiReqs) * 100} className="h-2" />
              </div>
              <div className="pt-1 text-[10px] text-muted-foreground">
                Plan: <Badge variant="secondary" className="text-[9px]">{pricingPlan}</Badge>
                {pricingPlan === 'free' && (
                  <Link href="/settings" className="text-violet-400 hover:underline ml-2">Upgrade</Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Content */}
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Recent Content</CardTitle>
            <Link href="/editor/new"><Button size="sm" variant="outline" className="text-xs">+ New Article</Button></Link>
          </div>
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
                <Link href="/editor/new" className="text-violet-400 hover:underline text-sm">Create your first article</Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
