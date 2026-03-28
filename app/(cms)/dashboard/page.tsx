'use client';

import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PipelineGraphCompact } from '@/components/PipelineGraph';

/* ─── Helpers ────────────────────────────────────────────────── */

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

/* Volume / difficulty / intent helpers */
function volumeLabel(v: number): { text: string; color: string } {
  if (v >= 5000) return { text: 'High', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  if (v >= 1000) return { text: 'Med', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  return { text: 'Low', color: 'bg-muted text-muted-foreground border-border' };
}

function intentLabel(kw: string): string {
  const lower = kw.toLowerCase();
  if (lower.includes('buy') || lower.includes('price') || lower.includes('cost') || lower.includes('cheap') || lower.includes('deal')) return 'Trans';
  if (lower.includes('best') || lower.includes('top') || lower.includes('review') || lower.includes('vs')) return 'Commercial';
  return 'Info';
}

function intentColor(intent: string): string {
  if (intent === 'Trans') return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  if (intent === 'Commercial') return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
  return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
}

/* ─── Phase descriptions ─────────────────────────────────────── */
function phaseText(phase: string | undefined): string {
  switch (phase) {
    case 'discovery': return 'Discovering keywords...';
    case 'planning': return 'Planning content calendar...';
    case 'generation': return 'Generating draft...';
    case 'optimization': return 'Optimizing SEO...';
    case 'distribution': return 'Distributing content...';
    case 'monitoring': return 'Monitoring performance...';
    default: return 'Idle';
  }
}

/* Activity feed icon by action type */
function activityIcon(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('keyword') || lower.includes('discover')) return '\uD83D\uDD0D';
  if (lower.includes('plan') || lower.includes('queue') || lower.includes('schedule')) return '\uD83D\uDCDD';
  if (lower.includes('draft') || lower.includes('generat') || lower.includes('writ')) return '\u270D\uFE0F';
  if (lower.includes('seo') || lower.includes('meta') || lower.includes('fix')) return '\uD83D\uDD27';
  if (lower.includes('alert') || lower.includes('drop') || lower.includes('position')) return '\uD83D\uDCCA';
  if (lower.includes('publish') || lower.includes('distribut')) return '\uD83D\uDE80';
  if (lower.includes('interlink') || lower.includes('link')) return '\uD83D\uDD17';
  if (lower.includes('refresh') || lower.includes('updat')) return '\u267B\uFE0F';
  return '\u2726';
}

/* ─── Main Dashboard ─────────────────────────────────────────── */

export default function DashboardPage() {
  const {
    content, keywords, pipeline,
    agents, autopilot, setAutopilot, siteName, settings,
    reviewQueue, publishLimits, publishLog,
  } = useWorkspace();

  const pendingReviewCount = reviewQueue?.filter((q) => q.status === 'pending')?.length ?? 0;

  const autopilotToggle = autopilot?.enabled ?? false;

  const published = useMemo(() => content.filter((c) => c.status === 'published'), [content]);
  const drafts = useMemo(() => content.filter((c) => c.status === 'draft'), [content]);
  const avgSEO = published.length ? Math.round(published.reduce((a, c) => a + (c.seoScore || 0), 0) / published.length) : 0;
  const activeAgents = Object.values(agents.registry).filter((a) => a.enabled).length;

  /* Publish stats */
  const publishedToday = useMemo(() => {
    const dayStart = Date.now() - 86400000;
    return content.filter((c) => c.status === 'published' && (c.publishDate || c.updated) > dayStart).length;
  }, [content]);
  const heldForReviewCount = useMemo(() => content.filter((c) => c.status === 'review').length, [content]);

  /* Autopilot state with safe access */
  const apBudget = autopilot?.creditBudget ?? { daily: 10, used_today: 0 };
  const apPhase = (autopilot as unknown as Record<string, unknown>)?.phase as string | undefined;

  /* Agent history for activity feed */
  const agentHistory = agents?.history ?? [];
  const recentActivity = useMemo(() => agentHistory.slice(0, 15), [agentHistory]);
  const lastThreeActions = useMemo(() => agentHistory.slice(0, 3), [agentHistory]);

  /* Discovered keywords — use keywords marked as opportunity or recently added */
  const discoveredKeywords = useMemo(
    () => keywords.filter((k) => k.status === 'opportunity').slice(0, 5),
    [keywords],
  );

  /* Content queue — pipeline items or drafts/scheduled */
  const contentQueue = useMemo(() => {
    const pipelineItems = pipeline
      .filter((p) => p.stage !== 'published')
      .sort((a, b) => b.updated - a.updated)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: p.title,
        status: p.stage === 'backlog' ? 'Planned' : p.stage === 'writing' ? 'Drafting...' : p.stage === 'review' ? 'Ready for Review' : 'Published',
        date: p.updated,
        contentId: p.contentId,
      }));
    if (pipelineItems.length > 0) return pipelineItems;
    // Fallback: recent drafts/review content
    return content
      .filter((c) => c.status === 'draft' || c.status === 'review' || c.status === 'scheduled')
      .sort((a, b) => b.updated - a.updated)
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status === 'draft' ? 'Drafting...' : c.status === 'review' ? 'Ready for Review' : c.status === 'scheduled' ? 'Planned' : c.status,
        date: c.scheduledAt || c.updated,
        contentId: c.id,
      }));
  }, [pipeline, content]);

  /* Performance alerts — content with issues */
  const performanceAlerts = useMemo(() => {
    const alerts: Array<{ message: string; severity: 'red' | 'amber'; contentId?: number }> = [];
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    let staleCount = 0;

    for (const c of published) {
      // Stale content
      if (c.updated && now - c.updated > ninetyDays) {
        staleCount++;
      }
      // Low SEO
      if (c.seoScore && c.seoScore < 40) {
        alerts.push({ message: `"${c.title}" has low SEO score (${c.seoScore})`, severity: 'red', contentId: c.id });
      }
    }

    if (staleCount > 0) {
      alerts.push({ message: `${staleCount} article${staleCount > 1 ? 's' : ''} haven't been updated in 90 days`, severity: 'amber' });
    }

    // Check for keywords that lost position
    for (const k of keywords) {
      if (k.status === 'lost') {
        alerts.push({ message: `Keyword "${k.keyword || k.term}" lost ranking`, severity: 'red' });
      }
    }

    return alerts.slice(0, 5);
  }, [published, keywords]);

  const hasNiche = !!(settings?.niche);
  const isNewUser = content.length === 0 && keywords.length === 0 && !hasNiche;

  /* Next run estimate */
  const conductorInterval = autopilot?.schedule?.conductor_interval ?? 21600000;
  const nextRunHours = Math.round(conductorInterval / 3600000);

  /* ── Boot animation state ─── */
  const [booted, setBooted] = useState(false);
  const [bootPhase, setBootPhase] = useState(0);
  useEffect(() => {
    // Stagger sections appearing like a system powering on
    const t1 = setTimeout(() => setBootPhase(1), 100);  // header
    const t2 = setTimeout(() => setBootPhase(2), 300);  // stat cards
    const t3 = setTimeout(() => setBootPhase(3), 600);  // content area
    const t4 = setTimeout(() => setBootPhase(4), 900);  // sidebar panels
    const t5 = setTimeout(() => { setBootPhase(5); setBooted(true); }, 1200); // fully loaded
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  const fadeIn = (phase: number) =>
    `transition-all duration-500 ${bootPhase >= phase ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`;

  return (
    <div className="space-y-6">
      {/* ── System boot line ─── */}
      <div className={`h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full transition-all duration-1000 ${booted ? 'w-full opacity-30' : 'w-0 opacity-100'}`} />

      {/* ── Header ─────────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-2 ${fadeIn(1)}`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {getGreeting()}, <span className="text-blue-400">{siteName || 'Conduit'}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {published.length} published · {activeAgents} agents active · Autopilot {autopilot?.enabled ? 'ON' : 'OFF'}
          </p>
          <p className="text-xs text-muted-foreground/50 font-mono mt-0.5">{formatDate()}</p>
        </div>
      </div>

      {/* ── Review Queue Banner ──────────────────────────── */}
      {pendingReviewCount > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <div className="flex items-center gap-3">
            <span className="text-xl">{'\u2714'}</span>
            <div>
              <span className="text-sm font-semibold text-foreground">
                {pendingReviewCount} item{pendingReviewCount !== 1 ? 's' : ''} need{pendingReviewCount === 1 ? 's' : ''} your review
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agent suggestions are waiting for your approval
              </p>
            </div>
          </div>
          <Link href="/review">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white">
              Review Now &rarr;
            </Button>
          </Link>
        </div>
      )}

      {/* ── A. Autopilot Status Bar ────────────────────── */}
      <Card className="bg-card/80 backdrop-blur border-border overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-semibold text-foreground">Autopilot</span>
              <button
                onClick={() => {
                  const next = !autopilotToggle;
                  setAutopilot({ enabled: next });
                  toast.success(next ? 'Autopilot enabled' : 'Autopilot paused');
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autopilotToggle ? 'bg-emerald-500' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    autopilotToggle ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <Badge
                variant={autopilotToggle ? 'default' : 'secondary'}
                className={`text-[9px] ${autopilotToggle ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-muted-foreground'}`}
              >
                {autopilotToggle ? 'ON' : 'OFF'}
              </Badge>
            </div>

            {/* Separator */}
            <div className="hidden sm:block w-px h-6 bg-border" />

            {/* Current phase */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1">
              {autopilotToggle && apPhase && apPhase !== 'idle' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                  </span>
                  <span>{phaseText(apPhase)}</span>
                </>
              ) : autopilotToggle ? (
                <span>Idle &mdash; next run in {nextRunHours}h</span>
              ) : (
                <span>Paused &mdash; <Link href="/autopilot" className="text-blue-400 hover:underline">configure autopilot</Link></span>
              )}
            </div>

            {/* Credits today */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span className="font-mono">{apBudget.used_today}/{apBudget.daily} daily budget</span>
            </div>
          </div>

          {/* Last 3 actions */}
          {lastThreeActions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-x-4 gap-y-1">
              {lastThreeActions.map((entry, i) => (
                <span key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="text-xs">{activityIcon(entry.action)}</span>
                  <span className="truncate max-w-[250px]">{entry.action}</span>
                  <span className="text-muted-foreground/40 font-mono">{relativeTime(entry.ts)}</span>
                </span>
              ))}
            </div>
          )}

          {lastThreeActions.length === 0 && autopilotToggle && (
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-[11px] text-muted-foreground">No actions yet. Agents will begin working based on your schedule.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pipeline Flow ──────────────────────────────── */}
      <PipelineGraphCompact />

      {/* ── Main Grid: Activity Feed + Right Panels ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── B. Agent Activity Feed (left 2/3) ────────── */}
        <div className="lg:col-span-2">
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Agent Activity</CardTitle>
                <Link href="/autopilot">
                  <Button size="sm" variant="outline" className="text-xs h-7 border-border hover:border-blue-500/50">
                    View Full Log
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivity.length > 0 ? (
                <div className="space-y-1">
                  {recentActivity.map((entry, i) => (
                    <div
                      key={`${entry.ts}-${i}`}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <span className="text-base mt-0.5 shrink-0">{activityIcon(entry.action)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{entry.action}</p>
                        {entry.creditsUsed > 0 && (
                          <span className="text-[10px] text-muted-foreground/50 font-mono">{entry.creditsUsed} credits</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground/50 font-mono whitespace-nowrap">
                          {relativeTime(entry.ts)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[10px] h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isNewUser ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <span className="text-2xl">{'\u2726'}</span>
                  </div>
                  <p className="text-base font-semibold text-foreground mb-1">Welcome to Conduit</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Set your niche in Settings to activate the autopilot. Agents will discover keywords, plan content, and optimize SEO automatically.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link href="/settings">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
                        Set Your Niche
                      </Button>
                    </Link>
                    <Link href="/autopilot">
                      <Button size="sm" variant="outline" className="border-border hover:border-blue-500/50">
                        Configure Autopilot
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                    <span className="text-2xl text-muted-foreground/50">{'\uD83E\uDD16'}</span>
                  </div>
                  <p className="text-base font-semibold text-foreground mb-1">No agent activity yet</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    {hasNiche
                      ? 'Enable the autopilot to let agents work autonomously on your content.'
                      : 'Set your niche in Settings to activate the autopilot.'}
                  </p>
                  <Link href={hasNiche ? '/autopilot' : '/settings'}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
                      {hasNiche ? 'Enable Autopilot' : 'Set Your Niche'}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column (1/3) ───────────────────────── */}
        <div className="space-y-4">

          {/* ── C. Discovered Keywords Panel ──────────── */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Discovered Keywords</CardTitle>
                <Link href="/seo" className="text-[10px] text-muted-foreground hover:text-blue-400 transition-colors uppercase tracking-wider">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {discoveredKeywords.length > 0 ? (
                <div className="space-y-2">
                  {discoveredKeywords.map((kw) => {
                    const vol = volumeLabel(kw.volume);
                    const intent = intentLabel(kw.keyword || kw.term || '');
                    return (
                      <div key={kw.id} className="p-2.5 rounded-lg border border-border hover:border-blue-500/30 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-sm font-medium text-foreground leading-tight">{kw.keyword || kw.term}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <Badge variant="outline" className={`text-[9px] ${vol.color}`}>
                            {vol.text} ({kw.volume.toLocaleString()})
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] ${intentColor(intent)}`}>
                            {intent}
                          </Badge>
                        </div>
                        {/* Difficulty bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all ${kw.difficulty <= 30 ? 'bg-emerald-400' : kw.difficulty <= 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                              style={{ width: `${kw.difficulty}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">{kw.difficulty}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">
                    {hasNiche
                      ? 'Autopilot will discover keywords based on your niche'
                      : 'Set your niche to start keyword discovery'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── D. Content Queue ──────────────────────── */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Content Queue</CardTitle>
                <Link href="/pipeline" className="text-[10px] text-muted-foreground hover:text-blue-400 transition-colors uppercase tracking-wider">
                  Pipeline
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {contentQueue.length > 0 ? (
                <div className="space-y-1.5">
                  {contentQueue.map((item) => {
                    const statusColors: Record<string, string> = {
                      'Planned': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                      'Drafting...': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                      'Ready for Review': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
                      'Published': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                    };
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.title || 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[9px] ${statusColors[item.status] || 'text-muted-foreground'}`}>
                              {item.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/50 font-mono">
                              {relativeTime(item.date)}
                            </span>
                          </div>
                        </div>
                        {(item.status === 'Drafting...' || item.status === 'Ready for Review') && item.contentId && (
                          <Link href={`/editor/${item.contentId}`}>
                            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-blue-400 hover:text-blue-300">
                              Review
                            </Button>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">
                    No content in queue &mdash; autopilot will plan content based on discovered keywords
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── E. Performance Alerts ─────────────────── */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Performance Alerts</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {performanceAlerts.length > 0 ? (
                <div className="space-y-1.5">
                  {performanceAlerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                        alert.severity === 'red'
                          ? 'border-rose-500/20 bg-rose-500/5'
                          : 'border-amber-500/20 bg-amber-500/5'
                      }`}
                    >
                      <span className={`text-xs mt-0.5 ${alert.severity === 'red' ? 'text-rose-400' : 'text-amber-400'}`}>
                        {alert.severity === 'red' ? '\u26A0' : '\u26A0'}
                      </span>
                      <p className={`text-xs flex-1 ${alert.severity === 'red' ? 'text-rose-300' : 'text-amber-300'}`}>
                        {alert.message}
                      </p>
                      {alert.contentId && (
                        <Link href={`/editor/${alert.contentId}`}>
                          <Button size="sm" variant="ghost" className="text-[10px] h-5 px-1.5 text-muted-foreground hover:text-foreground">
                            Fix
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <span className="text-emerald-400 text-sm">{'\u2713'}</span>
                  <span className="text-xs text-emerald-400">All content performing well</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── F. Quick Stats Row (bottom, full width) ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Publishing */}
        <Link href="/publish-settings" className="block">
          <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-rose-500 hover:border-rose-500/50 transition-colors h-full">
            <CardContent className="p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Publishing</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block h-2 w-2 rounded-full ${publishLimits.autoPublishEnabled ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={`text-sm font-semibold ${publishLimits.autoPublishEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {publishLimits.autoPublishEnabled ? 'Auto ON' : 'Auto OFF'}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {publishedToday}/{publishLimits.maxPerDay} today
                {heldForReviewCount > 0 && (
                  <span className="text-amber-400 ml-1">&middot; {heldForReviewCount} held</span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Total Content */}
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-blue-500">
          <CardContent className="p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Content</span>
            <div className="text-2xl font-bold text-foreground mt-1">{content.length}</div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
              <span>{published.length} published</span>
              <span className="text-muted-foreground/30">&middot;</span>
              <span>{drafts.length} drafts</span>
            </div>
          </CardContent>
        </Card>

        {/* Avg SEO Score */}
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-emerald-500">
          <CardContent className="p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg SEO Score</span>
            <div className={`text-2xl font-bold mt-1 ${scoreColor(avgSEO)}`}>{avgSEO}<span className="text-sm text-muted-foreground font-normal">/100</span></div>
            <div className="mt-1">
              <div className="flex h-1 rounded-full overflow-hidden bg-muted">
                <div className={`${scoreBg(avgSEO)} transition-all`} style={{ width: `${avgSEO}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keywords Tracked */}
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-violet-500">
          <CardContent className="p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Keywords Tracked</span>
            <div className="text-2xl font-bold text-violet-400 mt-1">{keywords.length}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {discoveredKeywords.length} opportunities found
            </div>
          </CardContent>
        </Card>

        {/* Agent Actions Today */}
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-cyan-500">
          <CardContent className="p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Agent Actions Today</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {agentHistory.filter((h) => Date.now() - h.ts < 86400000).length}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {activeAgents} of 8 agents active
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
