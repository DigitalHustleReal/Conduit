'use client';

import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { useMemo } from 'react';

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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 60) return 'bg-blue-400';
  if (score >= 40) return 'bg-amber-400';
  return 'bg-rose-400';
}

function statusDot(status: string): string {
  if (status === 'published') return 'bg-emerald-400';
  if (status === 'review') return 'bg-blue-400';
  return 'bg-amber-400';
}

export default function DashboardPage() {
  const { content, keywords, pipeline, credits, pricingPlan, agents, autopilot, siteName, settings } = useWorkspace();

  const published = useMemo(() => content.filter((c) => c.status === 'published'), [content]);
  const drafts = useMemo(() => content.filter((c) => c.status === 'draft'), [content]);
  const review = useMemo(() => content.filter((c) => c.status === 'review'), [content]);
  const avgSEO = published.length ? Math.round(published.reduce((a, c) => a + (c.seoScore || 0), 0) / published.length) : 0;
  const avgAI = published.length ? Math.round(published.reduce((a, c) => a + (c.aiScore || 0), 0) / published.length) : 0;
  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;
  const creditPct = Math.min((credits.aiCalls / limits.aiCalls) * 100, 100);
  const activeAgents = Object.values(agents.registry).filter((a) => a.enabled).length;
  const totalContent = content.length;
  const pubPct = totalContent ? (published.length / totalContent) * 100 : 0;
  const draftPct = totalContent ? (drafts.length / totalContent) * 100 : 0;
  const reviewPct = totalContent ? (review.length / totalContent) * 100 : 0;

  const recentContent = useMemo(
    () => [...content].sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 8),
    [content],
  );

  const quickActions = [
    { href: '/editor/new', label: 'New Article', desc: 'Create content with AI assistance', iconPath: 'M12 4v16m8-8H4', color: 'blue' },
    { href: '/ai-studio', label: 'AI Studio', desc: '21 specialized AI tools', iconPath: 'M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.772.13c-1.687.282-3.415.376-5.113.276a24.137 24.137 0 0 1-3.25-.39', color: 'cyan' },
    { href: '/agents', label: 'AI Agents', desc: `${activeAgents} of 8 agents active`, iconPath: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 15.75 4.5h-9A2.25 2.25 0 0 0 4.5 6.75v10.5A2.25 2.25 0 0 0 6.75 19.5Z', color: 'emerald' },
    { href: '/seo', label: 'SEO Center', desc: `Average score: ${avgSEO}`, iconPath: 'M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605', color: 'violet' },
  ];

  const colorMap: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
    blue: { border: 'border-l-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', iconBg: 'bg-blue-500/15' },
    cyan: { border: 'border-l-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400', iconBg: 'bg-cyan-500/15' },
    emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/15' },
    violet: { border: 'border-l-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-400', iconBg: 'bg-violet-500/15' },
    amber: { border: 'border-l-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400', iconBg: 'bg-amber-500/15' },
    rose: { border: 'border-l-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-400', iconBg: 'bg-rose-500/15' },
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, <span className="text-blue-400">{siteName || 'Conduit'}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span>{published.length} published</span>
            <span className="text-muted-foreground/50">&#183;</span>
            <span>{activeAgents} agents active</span>
            <span className="text-muted-foreground/50">&#183;</span>
            <span className="flex items-center gap-1.5">
              Autopilot
              {autopilot.enabled ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  ON
                </span>
              ) : (
                <span className="text-muted-foreground font-medium">OFF</span>
              )}
            </span>
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono hidden sm:block">{formatDate()}</div>
      </div>

      {/* ── Top Metrics Row ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Content */}
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Content</span>
              <svg className="w-4 h-4 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            </div>
            <div className="text-3xl font-bold text-foreground mb-3">{totalContent}</div>
            {/* Mini stacked bar */}
            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted mb-2">
              {pubPct > 0 && <div className="bg-emerald-400 transition-all" style={{ width: `${pubPct}%` }} />}
              {draftPct > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${draftPct}%` }} />}
              {reviewPct > 0 && <div className="bg-blue-400 transition-all" style={{ width: `${reviewPct}%` }} />}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{published.length} pub</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{drafts.length} draft</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />{review.length} review</span>
            </div>
          </CardContent>
        </Card>

        {/* Avg SEO Score */}
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg SEO Score</span>
              <svg className="w-4 h-4 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            </div>
            <div className="flex items-end gap-3">
              <div className={`text-3xl font-bold ${scoreColor(avgSEO)}`}>{avgSEO}</div>
              <span className="text-xs text-muted-foreground mb-1">/ 100</span>
            </div>
            <div className="mt-3">
              <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                <div className={`${scoreBg(avgSEO)} transition-all`} style={{ width: `${avgSEO}%` }} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {avgSEO >= 80 ? 'Excellent optimization' : avgSEO >= 60 ? 'Good, room to improve' : avgSEO >= 40 ? 'Needs attention' : 'Critical — run SEO Guardian'}
            </p>
          </CardContent>
        </Card>

        {/* Active Agents */}
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-cyan-500 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Agents</span>
              <svg className="w-4 h-4 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 15.75 4.5h-9A2.25 2.25 0 0 0 4.5 6.75v10.5A2.25 2.25 0 0 0 6.75 19.5Z" /></svg>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${activeAgents > 0 ? 'text-cyan-400' : 'text-muted-foreground'}`}>{activeAgents}</span>
              <span className="text-xs text-muted-foreground mb-1">of 8 running</span>
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${i < activeAgents ? 'bg-cyan-400' : 'bg-muted'}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {activeAgents === 0 ? 'No agents running' : `${activeAgents} agent${activeAgents > 1 ? 's' : ''} monitoring your content`}
            </p>
          </CardContent>
        </Card>

        {/* AI Credits */}
        <Card className={`bg-card/80 backdrop-blur border-border border-l-[3px] ${creditPct >= 80 ? 'border-l-rose-500' : 'border-l-violet-500'} hover:shadow-lg transition-all duration-200`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Credits</span>
              <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">{pricingPlan}</Badge>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${creditPct >= 80 ? 'text-rose-400' : 'text-violet-400'}`}>{credits.aiCalls}</span>
              <span className="text-xs text-muted-foreground mb-1">/ {limits.aiCalls}</span>
            </div>
            <div className="mt-3">
              <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                <div
                  className={`transition-all ${creditPct >= 80 ? 'bg-rose-400' : creditPct >= 50 ? 'bg-amber-400' : 'bg-violet-400'}`}
                  style={{ width: `${creditPct}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {creditPct >= 90 ? 'Almost depleted' : creditPct >= 80 ? 'Running low' : `${Math.round(100 - creditPct)}% remaining`}
              {pricingPlan === 'free' && (
                <Link href="/settings" className="text-blue-400 hover:underline ml-1.5">Upgrade</Link>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Area ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column — Recent Content (2/3) */}
        <div className="lg:col-span-2">
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Content</CardTitle>
                <Link href="/editor/new">
                  <Button size="sm" variant="outline" className="text-xs h-7 border-border hover:border-blue-500/50">
                    + New Article
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentContent.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border">
                        <th className="text-left py-2 pr-2 font-semibold">Status</th>
                        <th className="text-left py-2 pr-2 font-semibold">Title</th>
                        <th className="text-left py-2 pr-2 font-semibold w-24">SEO</th>
                        <th className="text-left py-2 pr-2 font-semibold w-24">AI</th>
                        <th className="text-right py-2 pr-2 font-semibold">Words</th>
                        <th className="text-right py-2 font-semibold">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentContent.map((c) => {
                        const seo = c.seoScore || 0;
                        const ai = c.aiScore || 0;
                        return (
                          <tr key={c.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors group">
                            <td className="py-2.5 pr-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${statusDot(c.status)}`} />
                            </td>
                            <td className="py-2.5 pr-2 max-w-[260px]">
                              <Link href={`/editor/${c.id}`} className="text-foreground hover:text-blue-400 transition-colors font-medium truncate block">
                                {c.title || 'Untitled'}
                              </Link>
                              {c.collection && <span className="text-[10px] text-muted-foreground/50">{c.collection}</span>}
                            </td>
                            <td className="py-2.5 pr-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[60px]">
                                  <div className={`h-full ${scoreBg(seo)} transition-all`} style={{ width: `${seo}%` }} />
                                </div>
                                <span className={`text-xs font-mono ${scoreColor(seo)}`}>{seo}</span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[60px]">
                                  <div className={`h-full ${scoreBg(ai)} transition-all`} style={{ width: `${ai}%` }} />
                                </div>
                                <span className={`text-xs font-mono ${scoreColor(ai)}`}>{ai}</span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-2 text-right text-xs text-muted-foreground font-mono">
                              {(c.wordCount || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-[11px] text-muted-foreground font-mono">
                              {c.updated ? relativeTime(c.updated) : '--'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-1">No content yet</p>
                  <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">Create your first article and let AI agents optimize it automatically.</p>
                  <Link href="/editor/new">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
                      Create First Article
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              {quickActions.map((qa) => {
                const c = colorMap[qa.color] || colorMap.blue;
                return (
                  <Link key={qa.href} href={qa.href}>
                    <div className={`flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all duration-200 group cursor-pointer`}>
                      <div className={`w-9 h-9 rounded-lg ${c.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                        <svg className={`w-4 h-4 ${c.text}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d={qa.iconPath} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground group-hover:text-foreground transition-colors">{qa.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{qa.desc}</div>
                      </div>
                      <svg className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Agent Status */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Agent Status</CardTitle>
                <Link href="/agents" className="text-[10px] text-muted-foreground hover:text-blue-400 transition-colors uppercase tracking-wider">View All</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-0.5">
                {Object.entries(agents.registry).map(([id, agent]) => (
                  <div key={id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2 w-2">
                        {agent.enabled && agent.running && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.enabled ? (agent.running ? 'bg-emerald-400' : 'bg-emerald-400/60') : 'bg-muted-foreground/30'}`} />
                      </span>
                      <span className={`${agent.enabled ? 'text-foreground' : 'text-muted-foreground/50'}`}>{AGENT_NAMES[id] || id}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      {agent.lastRun ? relativeTime(agent.lastRun) : 'Never'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Autopilot Mini Card */}
          <Card className={`bg-card/80 backdrop-blur border-border ${autopilot.enabled ? 'border-emerald-500/20' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Autopilot</span>
                  <Badge variant={autopilot.enabled ? 'default' : 'secondary'} className={`text-[9px] ${autopilot.enabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-muted-foreground'}`}>
                    {autopilot.enabled ? 'ON' : 'OFF'}
                  </Badge>
                </div>
                <Link href="/agents" className="text-[10px] text-muted-foreground hover:text-blue-400 transition-colors">Configure</Link>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Budget used today</span>
                  <span className="font-mono text-muted-foreground">{autopilot.creditBudget.used_today} / {autopilot.creditBudget.daily}</span>
                </div>
                <div className="flex h-1 rounded-full overflow-hidden bg-muted">
                  <div
                    className={`transition-all ${autopilot.creditBudget.used_today / autopilot.creditBudget.daily > 0.8 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min((autopilot.creditBudget.used_today / autopilot.creditBudget.daily) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
                  <span>{autopilot.stats.total_runs} runs</span>
                  <span>{autopilot.stats.articles_created} articles</span>
                  <span>{autopilot.stats.issues_fixed} fixes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Bottom: Full-Width Credit Bar ──────────────── */}
      <Card className="bg-card/80 backdrop-blur border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credit Usage</span>
              <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">{pricingPlan} plan</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-mono">{credits.aiCalls} / {limits.aiCalls} AI calls</span>
              <span className="text-border">|</span>
              <span className="font-mono">{credits.storage} / {limits.storage} MB storage</span>
              <span className="text-border">|</span>
              <span className="font-mono">{credits.apiReqs} / {limits.apiReqs} API reqs</span>
            </div>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            <div
              className={`transition-all rounded-full ${creditPct >= 80 ? 'bg-rose-400' : creditPct >= 50 ? 'bg-amber-400' : 'bg-blue-400'}`}
              style={{ width: `${creditPct}%` }}
            />
          </div>
          {pricingPlan === 'free' && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              On the Free plan.{' '}
              <Link href="/settings" className="text-blue-400 hover:underline">
                Upgrade to Pro
              </Link>{' '}
              for 10x more credits and priority support.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
