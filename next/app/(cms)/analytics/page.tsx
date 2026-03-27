'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button, buttonVariants } from '@/components/ui/button';
import { isGSCConnected, fetchGSCData, dateRangeFromLabel } from '@/lib/gsc';
import type { GSCQuery, GSCPage } from '@/lib/gsc';

type DateRangeLabel = '7d' | '28d' | '90d';

export default function AnalyticsPage() {
  const { content, credits, pricingPlan, agents, analyticsEvents, settings } = useWorkspace();

  const published = useMemo(() => content.filter((c) => c.status === 'published').length, [content]);
  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;
  const creditPct = limits.aiCalls > 0 ? Math.round((credits.aiCalls / limits.aiCalls) * 100) : 0;

  const recentEvents = useMemo(() => [...analyticsEvents].sort((a, b) => b.ts - a.ts).slice(0, 20), [analyticsEvents]);
  const agentHistory = useMemo(() => [...agents.history].sort((a, b) => b.ts - a.ts).slice(0, 15), [agents.history]);

  // Build a simple 7-day usage chart from analyticsEvents
  const weekChart = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const count = analyticsEvents.filter((e) => e.ts >= dayStart.getTime() && e.ts < dayEnd.getTime()).length;
      days.push({ label: dayStart.toLocaleDateString('en', { weekday: 'short' }), count });
    }
    return days;
  }, [analyticsEvents]);

  const maxCount = Math.max(1, ...weekChart.map((d) => d.count));

  // ── GSC State ──
  const gscConnected = isGSCConnected(settings);
  const [gscRange, setGscRange] = useState<DateRangeLabel>('28d');
  const [gscQueries, setGscQueries] = useState<GSCQuery[]>([]);
  const [gscPages, setGscPages] = useState<GSCPage[]>([]);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);

  const loadGSCData = useCallback(async () => {
    if (!gscConnected || !settings.gscSiteUrl || !settings.gscRefreshToken) return;
    setGscLoading(true);
    setGscError(null);
    try {
      const range = dateRangeFromLabel(gscRange);
      const [queryRes, pageRes] = await Promise.all([
        fetchGSCData(settings.gscSiteUrl, range, ['query'], settings.gscRefreshToken),
        fetchGSCData(settings.gscSiteUrl, range, ['page'], settings.gscRefreshToken),
      ]);
      setGscQueries(queryRes.rows as GSCQuery[]);
      setGscPages(pageRes.rows as GSCPage[]);
    } catch (err) {
      setGscError((err as Error).message);
    } finally {
      setGscLoading(false);
    }
  }, [gscConnected, settings.gscSiteUrl, settings.gscRefreshToken, gscRange]);

  useEffect(() => {
    if (gscConnected) {
      loadGSCData();
    }
  }, [gscConnected, gscRange, loadGSCData]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Content performance and AI usage.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Content</p>
            <p className="text-2xl font-bold">{content.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="text-2xl font-bold">{published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">AI Calls Used</p>
            <p className="text-2xl font-bold">{credits.aiCalls} / {limits.aiCalls}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Agent Runs</p>
            <p className="text-2xl font-bold">{agents.history.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Usage */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">Credit Usage</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">AI Calls</span>
            <span className="font-mono">{credits.aiCalls} / {limits.aiCalls} ({creditPct}%)</span>
          </div>
          <Progress value={creditPct} />
          <p className="text-xs text-muted-foreground mt-2">
            Plan: <Badge variant="secondary">{pricingPlan}</Badge> &mdash; Resets {new Date(credits.resetDate).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {/* 7-Day Usage Chart */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">7-Day Activity</CardTitle></CardHeader>
        <CardContent>
          {analyticsEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No events recorded yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {weekChart.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground">{day.count}</span>
                  <div className="w-full bg-primary/20 rounded-t" style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}>
                    <div className="w-full h-full bg-primary rounded-t" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Google Search Console Section ── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Search Console</CardTitle>
            {gscConnected && (
              <div className="flex gap-1">
                {(['7d', '28d', '90d'] as DateRangeLabel[]).map((r) => (
                  <Button key={r} size="sm" variant={gscRange === r ? 'default' : 'outline'} className="text-xs h-7 px-2"
                    onClick={() => setGscRange(r)}>
                    {r}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!gscConnected ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">
                Connect Google Search Console to see real ranking data, clicks, and impressions.
              </p>
              <a href="/api/gsc/auth" className={buttonVariants({ variant: 'outline' })}>Connect Google Search Console</a>
            </div>
          ) : gscLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading Search Console data...</p>
          ) : gscError ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-500 mb-2">{gscError}</p>
              <Button size="sm" variant="outline" onClick={loadGSCData}>Retry</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Queries */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-2">Top Queries</h3>
                {gscQueries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No query data for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4">Query</th>
                          <th className="pb-2 pr-4 text-right">Clicks</th>
                          <th className="pb-2 pr-4 text-right">Impressions</th>
                          <th className="pb-2 pr-4 text-right">CTR</th>
                          <th className="pb-2 text-right">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gscQueries.slice(0, 20).map((q, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5 pr-4 font-medium truncate max-w-[200px]">{q.query}</td>
                            <td className="py-1.5 pr-4 text-right font-mono">{q.clicks.toLocaleString()}</td>
                            <td className="py-1.5 pr-4 text-right font-mono">{q.impressions.toLocaleString()}</td>
                            <td className="py-1.5 pr-4 text-right font-mono">{q.ctr}%</td>
                            <td className="py-1.5 text-right font-mono">{q.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Top Pages */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-2">Top Pages</h3>
                {gscPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No page data for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4">Page</th>
                          <th className="pb-2 pr-4 text-right">Clicks</th>
                          <th className="pb-2 pr-4 text-right">Impressions</th>
                          <th className="pb-2 pr-4 text-right">CTR</th>
                          <th className="pb-2 text-right">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gscPages.slice(0, 15).map((p, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5 pr-4 font-medium truncate max-w-[250px]" title={(p as unknown as Record<string, string>).page}>
                              {(p as unknown as Record<string, string>).page?.replace(/^https?:\/\/[^/]+/, '') || '-'}
                            </td>
                            <td className="py-1.5 pr-4 text-right font-mono">{p.clicks.toLocaleString()}</td>
                            <td className="py-1.5 pr-4 text-right font-mono">{p.impressions.toLocaleString()}</td>
                            <td className="py-1.5 pr-4 text-right font-mono">{p.ctr}%</td>
                            <td className="py-1.5 text-right font-mono">{p.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recent events.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {recentEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between py-1 border-b last:border-0 text-sm">
                    <div>
                      <Badge variant="outline" className="text-[10px] mr-2">{evt.type}</Badge>
                      {evt.meta?.title ? String(evt.meta.title) : evt.contentId || 'System'}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(evt.ts).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Agent Performance</CardTitle></CardHeader>
          <CardContent>
            {agentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No agent runs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3">Agent</th>
                      <th className="pb-2 pr-3">Action</th>
                      <th className="pb-2 pr-3">Credits</th>
                      <th className="pb-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentHistory.map((entry, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 pr-3 font-medium">{entry.agentId}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground truncate max-w-[150px]">{entry.action}</td>
                        <td className="py-1.5 pr-3 font-mono">{entry.creditsUsed}</td>
                        <td className="py-1.5 text-xs text-muted-foreground">{new Date(entry.ts).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
