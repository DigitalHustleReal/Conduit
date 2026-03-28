'use client';

import { useMemo, useState, useCallback } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { estimateSiteStrength, analyzeSERP, generateStrategy } from '@/lib/agents/serp-intel';
import type { SiteStrength, SERPAnalysis, StrategyRecommendation } from '@/lib/agents/serp-intel';
import { detectClusters, scoreAuthority, planClusterCompletion, generateClusterLinks } from '@/lib/agents/topical-authority';
import type { TopicCluster, InterlinkSuggestion } from '@/lib/agents/topical-authority';
import { prioritizeKeywords } from '@/lib/agents/keyword-prioritizer';
import type { KeywordPriority } from '@/lib/agents/keyword-prioritizer';

/* ---------- colour helpers ------------------------------------------------ */

function daColor(da: number): string {
  if (da >= 60) return 'text-green-500';
  if (da >= 35) return 'text-yellow-500';
  return 'text-red-400';
}

function approachVariant(a: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (a === 'write-now') return 'default';
  if (a === 'cluster-first') return 'secondary';
  if (a === 'long-tail-approach') return 'outline';
  return 'destructive';
}

function approachColor(a: string): string {
  if (a === 'write-now') return 'bg-green-500/10 text-green-500 border-green-500/25';
  if (a === 'cluster-first') return 'bg-amber-500/10 text-amber-500 border-amber-500/25';
  if (a === 'long-tail-approach') return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
  return 'bg-red-500/10 text-red-400 border-red-500/25';
}

function authorityBadge(auth: TopicCluster['authority']): string {
  if (auth === 'dominant') return 'bg-green-500/15 text-green-500 border-green-500/25';
  if (auth === 'established') return 'bg-blue-500/15 text-blue-400 border-blue-500/25';
  if (auth === 'emerging') return 'bg-amber-500/15 text-amber-500 border-amber-500/25';
  return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25';
}

function competitionColor(c: string): string {
  if (c === 'low') return 'text-green-500';
  if (c === 'medium') return 'text-amber-500';
  if (c === 'high') return 'text-orange-500';
  return 'text-red-500';
}

function probabilityColor(p: string): string {
  if (p === 'high') return 'text-green-500';
  if (p === 'medium') return 'text-amber-500';
  return 'text-red-400';
}

/* ---------- filter type -------------------------------------------------- */

type PriorityFilter = 'all' | 'write-now' | 'cluster-first' | 'long-tail-approach' | 'trending';

/* ---------- page component ------------------------------------------------ */

export default function StrategyPage() {
  const { content, keywords, settings, domain, niche, competitors, autopilotEngineConfig, autopilotEngineState } = useWorkspace();
  const deductCredit = useWorkspace((s) => s.deductCredit);

  // SERP analysis state
  const [serpKeyword, setSerpKeyword] = useState('');
  const [serpResult, setSerpResult] = useState<SERPAnalysis | null>(null);
  const [serpLoading, setSerpLoading] = useState(false);

  // Strategy state
  const [strategyRecs, setStrategyRecs] = useState<StrategyRecommendation[]>([]);
  const [strategyLoading, setStrategyLoading] = useState(false);

  // Selected cluster
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // Filter
  const [filter, setFilter] = useState<PriorityFilter>('all');

  // ------ Computed data (heuristic, 0 credits) ------

  const siteStrength = useMemo<SiteStrength>(
    () => estimateSiteStrength(content, keywords, domain || 'mysite.com'),
    [content, keywords, domain],
  );

  const clusters = useMemo<TopicCluster[]>(
    () => detectClusters(content, keywords),
    [content, keywords],
  );

  const authorityScore = useMemo(
    () => scoreAuthority(clusters),
    [clusters],
  );

  const discoveredKeywords = autopilotEngineState?.discoveredKeywords || [];

  const priorityQueue = useMemo<KeywordPriority[]>(
    () => prioritizeKeywords(discoveredKeywords, siteStrength, clusters, content),
    [discoveredKeywords, siteStrength, clusters, content],
  );

  const filteredQueue = useMemo(() => {
    if (filter === 'all') return priorityQueue;
    if (filter === 'trending') {
      return priorityQueue.filter((k) => k.factors.trendingBonus >= 10);
    }
    return priorityQueue.filter((k) => k.approach === filter);
  }, [priorityQueue, filter]);

  const activeCluster = useMemo(
    () => clusters.find((c) => c.id === selectedCluster) || null,
    [clusters, selectedCluster],
  );

  const clusterLinks = useMemo<InterlinkSuggestion[]>(
    () => activeCluster ? generateClusterLinks(activeCluster) : [],
    [activeCluster],
  );

  // ------ Actions ------

  const handleAnalyzeSERP = useCallback(async () => {
    if (!serpKeyword.trim()) return;
    const ok = deductCredit('aiCalls');
    if (!ok) return;
    setSerpLoading(true);
    try {
      const config = autopilotEngineConfig || {
        niche: niche || settings.niche || 'general',
        domain: domain || '',
        language: 'en',
        targetAudience: 'general audience',
        contentGoal: 'traffic' as const,
        dailyBudget: 10,
        autoPublish: false,
        competitors: competitors || [],
      };
      const result = await analyzeSERP(
        serpKeyword.trim(),
        siteStrength,
        config,
        settings as unknown as Record<string, string>,
      );
      setSerpResult(result);
    } catch (err) {
      console.error('SERP analysis failed:', err);
    } finally {
      setSerpLoading(false);
    }
  }, [serpKeyword, siteStrength, autopilotEngineConfig, niche, domain, competitors, settings, deductCredit]);

  const handleGenerateStrategy = useCallback(async () => {
    if (discoveredKeywords.length === 0) return;
    const ok = deductCredit('aiCalls');
    if (!ok) return;
    setStrategyLoading(true);
    try {
      const config = autopilotEngineConfig || {
        niche: niche || settings.niche || 'general',
        domain: domain || '',
        language: 'en',
        targetAudience: 'general audience',
        contentGoal: 'traffic' as const,
        dailyBudget: 10,
        autoPublish: false,
        competitors: competitors || [],
      };
      const recs = await generateStrategy(
        discoveredKeywords,
        siteStrength,
        content,
        config,
        settings as unknown as Record<string, string>,
      );
      setStrategyRecs(recs);
    } catch (err) {
      console.error('Strategy generation failed:', err);
    } finally {
      setStrategyLoading(false);
    }
  }, [discoveredKeywords, siteStrength, content, autopilotEngineConfig, niche, domain, competitors, settings, deductCredit]);

  // ------ Render ------

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Content Strategy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SERP intelligence, topical authority, and keyword prioritization -- the brain that decides what to write next.
        </p>
      </div>

      {/* Row 1: Site Strength + Topic Clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Strength Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">{'🏗'}</span> Site Strength
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* DA Meter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Estimated Domain Authority</span>
                <span className={`text-2xl font-bold ${daColor(siteStrength.estimatedDA)}`}>
                  {siteStrength.estimatedDA}<span className="text-xs text-muted-foreground font-normal">/100</span>
                </span>
              </div>
              <Progress value={siteStrength.estimatedDA} className="h-2" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Content Volume</div>
                <div className="text-lg font-bold text-foreground">{siteStrength.contentVolume} <span className="text-xs font-normal text-muted-foreground">articles</span></div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Avg Quality</div>
                <div className="text-lg font-bold text-foreground">
                  {siteStrength.avgSEOScore} <span className="text-xs font-normal text-muted-foreground">SEO</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Publish Rate</div>
                <div className="text-lg font-bold text-foreground">{siteStrength.publishFrequency}<span className="text-xs font-normal text-muted-foreground">/week</span></div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Avg Length</div>
                <div className="text-lg font-bold text-foreground">{siteStrength.avgContentLength} <span className="text-xs font-normal text-muted-foreground">words</span></div>
              </div>
            </div>

            {/* Strengths / Weaknesses */}
            {siteStrength.strengths.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-green-500 mb-1">Strengths</div>
                <div className="flex flex-wrap gap-1.5">
                  {siteStrength.strengths.map((s, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {siteStrength.weaknesses.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-red-400 mb-1">Weaknesses</div>
                <div className="flex flex-wrap gap-1.5">
                  {siteStrength.weaknesses.map((w, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Topic Clusters Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-lg">{'🎯'}</span> Topic Clusters
              </CardTitle>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Authority</div>
                <div className="text-sm font-bold text-foreground">{authorityScore.level} ({authorityScore.score}/100)</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Authority progress */}
            <div>
              <Progress value={authorityScore.score} className="h-2 mb-1" />
              <p className="text-[11px] text-muted-foreground">{authorityScore.nextMilestone}</p>
            </div>

            {/* Cluster list */}
            {clusters.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No topic clusters detected yet. Publish content and group into collections to build clusters.
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {clusters.map((cluster) => (
                  <button
                    key={cluster.id}
                    onClick={() => setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedCluster === cluster.id
                        ? 'border-blue-500/50 bg-blue-500/5'
                        : 'border-border hover:border-border/80 bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">{cluster.topic}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${authorityBadge(cluster.authority)}`}>
                        {cluster.authority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{(cluster.pillarContent ? 1 : 0) + cluster.supportingContent.length} articles</span>
                      <span>{cluster.internalLinks} links</span>
                      <span>{cluster.completeness}% complete</span>
                    </div>
                    <Progress value={cluster.completeness} className="h-1 mt-2" />
                  </button>
                ))}
              </div>
            )}

            {/* Selected cluster details */}
            {activeCluster && (
              <div className="mt-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
                <div className="text-xs font-semibold text-foreground">Cluster: {activeCluster.topic}</div>
                {activeCluster.pillarContent && (
                  <div className="text-[11px] text-muted-foreground">
                    Pillar: <span className="text-foreground">{activeCluster.pillarContent.title}</span>
                  </div>
                )}
                {activeCluster.supportingContent.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Supporting: {activeCluster.supportingContent.map((s) => s.title).join(', ')}
                  </div>
                )}
                {activeCluster.missingTopics.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-amber-500 mb-1">Missing topics:</div>
                    <div className="flex flex-wrap gap-1">
                      {activeCluster.missingTopics.map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {clusterLinks.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    {clusterLinks.length} internal link{clusterLinks.length !== 1 ? 's' : ''} suggested
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Keyword Priority Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">{'📊'}</span> Keyword Priority Queue
            </CardTitle>
            <div className="flex items-center gap-2">
              {(['all', 'write-now', 'cluster-first', 'long-tail-approach', 'trending'] as PriorityFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    filter === f
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : 'text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'write-now' ? 'Quick Wins' : f === 'cluster-first' ? 'Cluster Building' : f === 'long-tail-approach' ? 'Long-tail' : 'Trending'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredQueue.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {discoveredKeywords.length === 0
                ? 'No discovered keywords yet. Run the Autopilot engine to discover keyword opportunities.'
                : 'No keywords match this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Keyword</th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Priority</th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Difficulty</th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Approach</th>
                    <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.slice(0, 25).map((kp, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 font-medium text-foreground">{kp.keyword}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`font-bold ${kp.score >= 70 ? 'text-green-500' : kp.score >= 50 ? 'text-amber-500' : 'text-red-400'}`}>
                          {kp.score}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-xs text-muted-foreground">{kp.factors.difficultyMatch}/25</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${approachColor(kp.approach)}`}>
                          {kp.approach.replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground max-w-[300px] truncate">{kp.reasoning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Generate Strategy button */}
          {discoveredKeywords.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleGenerateStrategy} disabled={strategyLoading} size="sm">
                {strategyLoading ? 'Generating...' : 'Generate AI Strategy (1 credit)'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 3: SERP Analysis + Strategy Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SERP Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">{'🔍'}</span> SERP Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={serpKeyword}
                onChange={(e) => setSerpKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeSERP()}
                placeholder="Enter a keyword to analyze..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <Button onClick={handleAnalyzeSERP} disabled={serpLoading || !serpKeyword.trim()} size="sm">
                {serpLoading ? 'Analyzing...' : 'Analyze (1 credit)'}
              </Button>
            </div>

            {serpResult && (
              <div className="space-y-3">
                {/* Competition level */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Competition</span>
                    <span className={`text-sm font-bold ${competitionColor(serpResult.estimatedCompetition)}`}>
                      {serpResult.estimatedCompetition.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                {/* Content requirements */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                  <div className="text-xs font-semibold text-foreground">Content Requirements</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Min words:</span>{' '}
                      <span className="text-foreground font-medium">{serpResult.contentRequirements.minWordCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Recommended:</span>{' '}
                      <span className="text-foreground font-medium">{serpResult.contentRequirements.recommendedWordCount}</span>
                    </div>
                  </div>
                  {serpResult.contentRequirements.requiredSections.length > 0 && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Required sections:</div>
                      <div className="flex flex-wrap gap-1">
                        {serpResult.contentRequirements.requiredSections.map((s, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {serpResult.contentRequirements.recommendedMedia.length > 0 && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Recommended media:</div>
                      <div className="flex flex-wrap gap-1">
                        {serpResult.contentRequirements.recommendedMedia.map((m, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {serpResult.contentRequirements.uniqueAngle && (
                    <div className="text-[11px]">
                      <span className="text-muted-foreground">Unique angle:</span>{' '}
                      <span className="text-foreground italic">{serpResult.contentRequirements.uniqueAngle}</span>
                    </div>
                  )}
                </div>

                {/* Can we rank? */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Can We Rank?</span>
                    <span className={`text-sm font-bold ${probabilityColor(serpResult.canWeRank.probability)}`}>
                      {serpResult.canWeRank.probability} probability
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{serpResult.canWeRank.reasoning}</p>
                  <div className="text-[11px]">
                    <span className="text-muted-foreground">Time to rank:</span>{' '}
                    <span className="text-foreground font-medium">{serpResult.canWeRank.timeToRank}</span>
                  </div>
                  {serpResult.canWeRank.requiredActions.length > 0 && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Required actions:</div>
                      <ul className="text-[11px] text-foreground space-y-0.5 ml-3">
                        {serpResult.canWeRank.requiredActions.map((a, i) => (
                          <li key={i} className="list-disc">{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Top results */}
                {serpResult.topResultsLikely.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                    <div className="text-xs font-semibold text-foreground">Estimated Top Results</div>
                    <div className="space-y-1.5">
                      {serpResult.topResultsLikely.slice(0, 5).map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <span className="w-5 text-center font-bold text-muted-foreground">#{r.position}</span>
                          <Badge variant="outline" className="text-[10px]">{r.estimatedType}</Badge>
                          <span className="text-muted-foreground">{r.estimatedWordCount} words</span>
                          <span className="text-muted-foreground">{r.domainType}</span>
                          {r.hasFAQ && <span className="text-blue-400">FAQ</span>}
                          {r.hasVideo && <span className="text-purple-400">Video</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategy Recommendations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">{'🧠'}</span> Strategy Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Always-visible heuristic tips */}
            <div className="space-y-2">
              {siteStrength.estimatedDA < 30 && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[12px] text-foreground">
                  <span className="font-semibold text-amber-500">Low DA ({siteStrength.estimatedDA}):</span>{' '}
                  Focus on long-tail keywords first. Head terms are too competitive for your current authority.
                </div>
              )}
              {clusters.length > 0 && clusters.some((c) => c.completeness < 60) && (
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[12px] text-foreground">
                  <span className="font-semibold text-blue-400">Incomplete clusters:</span>{' '}
                  {clusters.filter((c) => c.completeness < 60).map((c) =>
                    `"${c.topic}" needs ${c.missingTopics.length} more articles`
                  ).join('. ')}.
                </div>
              )}
              {siteStrength.internalLinkDensity < 1.5 && (
                <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-[12px] text-foreground">
                  <span className="font-semibold text-purple-400">Weak interlinking:</span>{' '}
                  Add more internal links between related articles. Aim for 3+ per article.
                </div>
              )}
              {priorityQueue.length > 0 && priorityQueue[0].approach === 'write-now' && (
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-[12px] text-foreground">
                  <span className="font-semibold text-green-500">Quick win available:</span>{' '}
                  Target &quot;{priorityQueue[0].keyword}&quot; -- low competition, high opportunity score ({priorityQueue[0].score}).
                </div>
              )}
            </div>

            {/* AI-generated strategy recommendations */}
            {strategyRecs.length > 0 && (
              <div className="space-y-2 mt-3">
                <div className="text-xs font-semibold text-foreground">AI-Generated Strategy</div>
                {strategyRecs.slice(0, 8).map((rec, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{rec.keyword}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${approachColor(rec.approach)}`}>
                          {rec.approach.replace(/-/g, ' ')}
                        </span>
                        <span className={`text-xs font-bold ${rec.priority >= 70 ? 'text-green-500' : rec.priority >= 50 ? 'text-amber-500' : 'text-red-400'}`}>
                          {rec.priority}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{rec.reasoning}</p>
                    {rec.steps.length > 0 && (
                      <ul className="text-[11px] text-foreground space-y-0.5 ml-3">
                        {rec.steps.slice(0, 3).map((step, si) => (
                          <li key={si} className="list-disc">{step}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>~{rec.estimatedCredits} credits</span>
                      <span>{rec.estimatedTimeToRank} to rank</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {strategyRecs.length === 0 && discoveredKeywords.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Run the Autopilot engine to discover keywords, then generate an AI-powered strategy.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
