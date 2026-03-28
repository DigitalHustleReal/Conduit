'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isGSCConnected, fetchGSCData, dateRangeFromLabel } from '@/lib/gsc';
import type { GSCQuery } from '@/lib/gsc';
import { runFeedbackCycle } from '@/lib/autopilot/scheduler';
import { learnFromFeedback } from '@/lib/autopilot/feedback';
import type { FeedbackInsight, QueueItem, FeedbackSummary, AgentLearning } from '@/lib/autopilot/feedback';

/* ---- Helpers ---------------------------------------------------------- */

function fmtCTR(ctr: number): string {
  return `${(ctr * 100).toFixed(1)}%`;
}

function fmtPos(pos: number): string {
  return pos > 0 ? `#${Math.round(pos)}` : '--';
}

function dayLabel(days: number): string {
  if (days < 1) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 60) return '1 month';
  return `${Math.floor(days / 30)} months`;
}

const INSIGHT_COLORS: Record<FeedbackInsight['type'], string> = {
  winning: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  declining: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
  opportunity: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  stale: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
  underperforming: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
};

const INSIGHT_ICONS: Record<FeedbackInsight['type'], string> = {
  winning: '\u2705',
  declining: '\uD83D\uDCC9',
  opportunity: '\uD83D\uDCA1',
  stale: '\u23F3',
  underperforming: '\u26A0\uFE0F',
};

const TYPE_LABELS: Record<FeedbackInsight['type'], string> = {
  winning: 'Winning',
  declining: 'Declining',
  opportunity: 'Opportunity',
  stale: 'Stale',
  underperforming: 'Underperforming',
};

/* ---- Main Page -------------------------------------------------------- */

export default function PerformancePage() {
  const { content, settings, agentFeedback } = useWorkspace();

  const gscConnected = isGSCConnected(settings);
  const [gscData, setGscData] = useState<GSCQuery[]>([]);
  const [gscLoading, setGscLoading] = useState(false);

  // Feedback cycle results
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [insights, setInsights] = useState<FeedbackInsight[]>([]);
  const [actions, setActions] = useState<QueueItem[]>([]);
  const [learning, setLearning] = useState<AgentLearning | null>(null);
  const [filter, setFilter] = useState<FeedbackInsight['type'] | 'all'>('all');

  // Load GSC data if connected
  const loadGSC = useCallback(async () => {
    if (!gscConnected || !settings.gscSiteUrl || !settings.gscRefreshToken) return;
    setGscLoading(true);
    try {
      const range = dateRangeFromLabel('28d');
      const resp = await fetchGSCData(settings.gscSiteUrl, range, ['query'], settings.gscRefreshToken);
      const rows = (resp.rows ?? []) as GSCQuery[];
      setGscData(rows);
    } catch {
      // GSC unavailable, proceed without
    } finally {
      setGscLoading(false);
    }
  }, [gscConnected, settings.gscSiteUrl, settings.gscRefreshToken]);

  // Run feedback cycle on load
  useEffect(() => {
    if (gscConnected) {
      loadGSC();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gscConnected]);

  // Re-run analysis when content or GSC data changes
  useEffect(() => {
    const result = runFeedbackCycle(
      { content, agentFeedback, settings },
      gscData.length > 0 ? gscData : undefined,
    );
    setSummary(result.summary);
    setInsights(result.insightsList);
    setActions(result.actions);

    // Compute learning from all historical feedback
    const approved = result.actions.filter((a) => a.status === 'approved');
    const rejected = result.actions.filter((a) => a.status === 'rejected');
    const agentLearning = learnFromFeedback(approved, rejected, agentFeedback);
    setLearning(agentLearning);
  }, [content, gscData, agentFeedback, settings]);

  // Filtered insights
  const filteredInsights = useMemo(() => {
    if (filter === 'all') return insights;
    return insights.filter((i) => i.type === filter);
  }, [insights, filter]);

  // Build content table rows by merging content with signals
  const tableRows = useMemo(() => {
    const published = content.filter((c) => c.status === 'published');
    return published.map((item) => {
      const keyword = (item.keyword || '').toLowerCase();
      const gsc = gscData.find((g) => g.query.toLowerCase() === keyword);
      const insight = insights.find((i) => i.contentId === String(item.id));
      const publishTs = item.publishDate || item.created;
      const age = Math.floor((Date.now() - publishTs) / 86400000);

      return {
        id: item.id,
        title: item.title,
        keyword: item.keyword || '--',
        position: gsc?.position,
        clicks: gsc?.clicks,
        ctr: gsc?.ctr,
        seoScore: item.seoScore ?? 0,
        age,
        insightType: insight?.type,
        insight,
      };
    });
  }, [content, gscData, insights]);

  // Simulated learning stats
  const totalFeedbackActions = agentFeedback?.length ?? 0;
  const approvedCount = agentFeedback?.filter((f) => f.action === 'accepted')?.length ?? 0;
  const rejectedCount = agentFeedback?.filter((f) => f.action === 'rejected')?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Feedback loop &mdash; real data drives smarter agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gscConnected ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
              GSC Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs text-muted-foreground">
              GSC Not Connected
            </Badge>
          )}
          {gscLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading GSC data...</span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/80 backdrop-blur border-border">
          <CardContent className="p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Winning
            </div>
            <div className="text-2xl font-bold text-emerald-400">{summary?.winning ?? 0}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Ranking well, keep going</div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur border-border">
          <CardContent className="p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Declining
            </div>
            <div className="text-2xl font-bold text-rose-400">{summary?.declining ?? 0}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Lost positions, needs refresh</div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur border-border">
          <CardContent className="p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Opportunities
            </div>
            <div className="text-2xl font-bold text-amber-400">{summary?.opportunities ?? 0}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">High impressions, low CTR</div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur border-border">
          <CardContent className="p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Stale
            </div>
            <div className="text-2xl font-bold text-zinc-400">{summary?.stale ?? 0}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Not updated in 90+ days</div>
          </CardContent>
        </Card>
      </div>

      {/* GSC CTA when not connected */}
      {!gscConnected && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">{'\uD83D\uDD17'}</div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">Connect Google Search Console</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-lg">
                  With GSC connected, agents use real ranking data, click-through rates, and impression
                  counts to make dramatically smarter decisions. The feedback loop becomes a true flywheel.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Currently showing analysis based on content scores only. Connect GSC for position
                  tracking, CTR optimization suggestions, and decline alerts.
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-blue-600 hover:bg-blue-500 text-white text-xs"
                  onClick={() => {
                    window.location.href = '/api/gsc/auth';
                  }}
                >
                  Connect Google Search Console
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Averages Row (when GSC is connected) */}
      {gscConnected && summary && (summary.avgPosition > 0 || summary.avgCTR > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardContent className="p-4">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Avg Position
              </div>
              <div className="text-lg font-bold text-foreground">{fmtPos(summary.avgPosition)}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardContent className="p-4">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Avg CTR
              </div>
              <div className="text-lg font-bold text-foreground">{fmtCTR(summary.avgCTR)}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardContent className="p-4">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Total Content
              </div>
              <div className="text-lg font-bold text-foreground">{summary.totalContent}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardContent className="p-4">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Actions Queued
              </div>
              <div className="text-lg font-bold text-foreground">{actions.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Performance Table */}
      <Card className="bg-card/80 backdrop-blur border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold">Content Performance</CardTitle>
            <div className="flex items-center gap-1">
              {(['all', 'winning', 'declining', 'opportunity', 'stale', 'underperforming'] as const).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      filter === f
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {f === 'all' ? 'All' : TYPE_LABELS[f]}
                  </button>
                ),
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {tableRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Title</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Keyword</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Position</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Clicks</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">CTR</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">SEO</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Age</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows
                    .filter((row) => {
                      if (filter === 'all') return true;
                      return row.insightType === filter;
                    })
                    .map((row) => {
                      const rowColor = row.insightType
                        ? INSIGHT_COLORS[row.insightType]
                        : '';
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                            row.insightType ? 'bg-opacity-5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-2 max-w-[200px] truncate text-foreground font-medium">
                            {row.title}
                          </td>
                          <td className="py-2.5 px-2 text-muted-foreground max-w-[150px] truncate">
                            {row.keyword}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-foreground">
                            {row.position !== undefined ? fmtPos(row.position) : '--'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-foreground">
                            {row.clicks ?? '--'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-foreground">
                            {row.ctr !== undefined ? fmtCTR(row.ctr) : '--'}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span
                              className={`font-mono ${
                                row.seoScore >= 70
                                  ? 'text-emerald-400'
                                  : row.seoScore >= 50
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                              }`}
                            >
                              {row.seoScore}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">
                            {dayLabel(row.age)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {row.insightType && (
                              <Badge
                                variant="secondary"
                                className={`text-[8px] px-1.5 py-0.5 border ${rowColor}`}
                              >
                                {INSIGHT_ICONS[row.insightType]} {TYPE_LABELS[row.insightType]}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {row.insight && row.insight.suggestedAction !== 'nothing' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[10px] h-6 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              >
                                Fix
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No published content yet. Publish articles to see performance data here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Feed */}
      {filteredInsights.length > 0 && (
        <Card className="bg-card/80 backdrop-blur border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Insights &amp; Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {filteredInsights.slice(0, 15).map((insight, idx) => (
              <div
                key={`${insight.contentId}-${idx}`}
                className={`flex items-start gap-3 p-3 rounded-lg border ${INSIGHT_COLORS[insight.type]}`}
              >
                <span className="text-sm shrink-0">{INSIGHT_ICONS[insight.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{TYPE_LABELS[insight.type]}</span>
                    <Badge variant="secondary" className="text-[8px]">
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/80">{insight.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Suggested: <span className="font-medium text-foreground/60">{insight.suggestedAction}</span>
                    {insight.slug && (
                      <span className="ml-2 font-mono text-muted-foreground/50">/{insight.slug}</span>
                    )}
                  </p>
                </div>
                {insight.suggestedAction !== 'nothing' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-[10px] h-7 border-current/30 hover:bg-current/10"
                  >
                    Queue Fix
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Agent Learning Summary */}
      <Card className="bg-card/80 backdrop-blur border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Agent Learning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Feedback Processed
              </div>
              <div className="text-lg font-bold text-foreground">{totalFeedbackActions}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {approvedCount} approvals, {rejectedCount} rejections
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Approval Rate
              </div>
              <div className="text-lg font-bold text-foreground">
                {totalFeedbackActions > 0
                  ? `${Math.round((approvedCount / totalFeedbackActions) * 100)}%`
                  : '--'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Higher is better
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Learning Status
              </div>
              <div className="text-lg font-bold text-foreground">
                {totalFeedbackActions >= 10 ? 'Active' : 'Gathering Data'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {totalFeedbackActions >= 10
                  ? 'Agents are adapting to your preferences'
                  : `Need ${Math.max(0, 10 - totalFeedbackActions)} more feedback actions`}
              </div>
            </div>
          </div>

          {/* Learning insights */}
          {learning && learning.insights.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                What agents have learned
              </div>
              {learning.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-foreground/80 p-2 rounded-lg bg-muted/20"
                >
                  <span className="text-blue-400 shrink-0">{'\uD83E\uDDE0'}</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          )}

          {/* Preferred / avoided topics */}
          {learning && (learning.preferredTopics.length > 0 || learning.avoidedTopics.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learning.preferredTopics.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Topics that perform best
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {learning.preferredTopics.slice(0, 6).map((topic) => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {learning.avoidedTopics.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Avoided topics
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {learning.avoidedTopics.slice(0, 6).map((topic) => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/20"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {totalFeedbackActions === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                No feedback data yet. As you approve and reject agent suggestions,
                they will learn your preferences and produce better content.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
