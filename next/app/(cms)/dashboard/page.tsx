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
    { label: 'Published', value: published.length, icon: '\uD83D\uDCC4', color: 'text-emerald-400', borderColor: 'border-l-emerald-500', bgGlow: 'hover:shadow-emerald-500/5' },
    { label: 'Drafts', value: drafts.length, icon: '\uD83D\uDCDD', color: 'text-amber-400', borderColor: 'border-l-amber-500', bgGlow: 'hover:shadow-amber-500/5' },
    { label: 'In Review', value: review.length, icon: '\uD83D\uDC41', color: 'text-blue-400', borderColor: 'border-l-blue-500', bgGlow: 'hover:shadow-blue-500/5' },
    { label: 'Keywords', value: keywords.length, icon: '\uD83D\uDD11', color: 'text-violet-400', borderColor: 'border-l-violet-500', bgGlow: 'hover:shadow-violet-500/5' },
    { label: 'Avg SEO', value: avgSEO, icon: '\uD83D\uDD0D', color: avgSEO >= 70 ? 'text-emerald-400' : 'text-amber-400', borderColor: avgSEO >= 70 ? 'border-l-emerald-500' : 'border-l-amber-500', bgGlow: 'hover:shadow-violet-500/5' },
    { label: 'Avg AI Quality', value: avgAI, icon: '\u2726', color: avgAI >= 70 ? 'text-emerald-400' : 'text-amber-400', borderColor: avgAI >= 70 ? 'border-l-emerald-500' : 'border-l-amber-500', bgGlow: 'hover:shadow-violet-500/5' },
    { label: 'Active Agents', value: activeAgents, icon: '\uD83E\uDD16', color: activeAgents > 0 ? 'text-emerald-400' : 'text-muted-foreground', borderColor: 'border-l-cyan-500', bgGlow: 'hover:shadow-cyan-500/5' },
    { label: 'AI Credits', value: `${credits.aiCalls}/${limits.aiCalls}`, icon: '\uD83D\uDD2E', color: creditPct >= 80 ? 'text-red-400' : 'text-violet-400', borderColor: creditPct >= 80 ? 'border-l-red-500' : 'border-l-violet-500', bgGlow: 'hover:shadow-violet-500/5' },
  ];

  const quickActions = [
    { href: '/editor/new', icon: '\u2726', label: 'New Article', desc: 'Create with AI', gradient: 'from-violet-500/20 to-violet-600/5', hoverBorder: 'hover:border-violet-500/50' },
    { href: '/ai-studio', icon: '\uD83E\uDDE0', label: 'AI Studio', desc: '21 AI tools', gradient: 'from-pink-500/20 to-pink-600/5', hoverBorder: 'hover:border-pink-500/50' },
    { href: '/agents', icon: '\uD83E\uDD16', label: 'AI Agents', desc: `${activeAgents} active`, gradient: 'from-emerald-500/20 to-emerald-600/5', hoverBorder: 'hover:border-emerald-500/50' },
    { href: '/seo', icon: '\uD83D\uDD0D', label: 'SEO Center', desc: `Avg score: ${avgSEO}`, gradient: 'from-cyan-500/20 to-cyan-600/5', hoverBorder: 'hover:border-cyan-500/50' },
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Overview</p>
        <h1 className="text-2xl font-bold">{siteName} Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {content.length} articles &middot; {keywords.length} keywords &middot; {activeAgents} agents active
          {autopilot.enabled && <Badge variant="outline" className="ml-2 text-emerald-400 border-emerald-400/30">Autopilot ON</Badge>}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {metrics.map((m) => (
          <Card key={m.label} className={`bg-card border-l-[3px] ${m.borderColor} hover:shadow-lg ${m.bgGlow} transition-all duration-200 hover:-translate-y-0.5`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{m.icon}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{m.label}</span>
              </div>
              <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {quickActions.map((qa) => (
          <Link key={qa.href} href={qa.href}>
            <Card className={`bg-card ${qa.hoverBorder} transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg group`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${qa.gradient} flex items-center justify-center text-lg group-hover:scale-110 transition-transform duration-200`}>{qa.icon}</div>
                <div>
                  <div className="font-semibold text-sm">{qa.label}</div>
                  <div className="text-xs text-muted-foreground">{qa.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
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
                <div key={id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 transition-colors">
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
          <div className="space-y-1">
            {content.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/editor/${c.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={c.status === 'published' ? 'default' : 'secondary'}
                    className={`text-[10px] ${
                      c.status === 'published' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                      c.status === 'review' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' :
                      ''
                    }`}
                  >
                    {c.status}
                  </Badge>
                  <span className="text-sm font-medium group-hover:text-violet-400 transition-colors">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{c.collection}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className={c.aiScore && c.aiScore >= 70 ? 'text-emerald-400' : ''}>AI: {c.aiScore || 0}</span>
                  <span className={c.seoScore && c.seoScore >= 70 ? 'text-emerald-400' : ''}>SEO: {c.seoScore || 0}</span>
                  <span>{(c.wordCount || 0).toLocaleString()}w</span>
                </div>
              </Link>
            ))}
            {content.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-3">{'\u2726'}</div>
                <p className="text-lg font-semibold mb-2">No content yet</p>
                <p className="text-sm mb-4">Create your first article and let AI agents optimize it.</p>
                <Link href="/editor/new">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                    Create First Article
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
