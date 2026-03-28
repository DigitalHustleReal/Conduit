'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isGSCConnected, fetchGSCData, dateRangeFromLabel } from '@/lib/gsc';
import type { GSCQuery } from '@/lib/gsc';
import { SeedUploader } from '@/components/SeedUploader';
import type { SeedData } from '@/lib/autopilot/seed';
import { fetchSuggestionsClient, type AutocompleteResult } from '@/lib/seo/google-autocomplete';
import { scoreKeyword, rankKeywords, type RankedKeyword } from '@/lib/seo/keyword-brain';

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-500';
}

function scoreBg(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

const TREND_ICON: Record<string, string> = { up: '\u2191', down: '\u2193', stable: '\u2192' };
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  tracked: 'secondary', top5: 'default', top10: 'default', top20: 'outline', opportunity: 'secondary', lost: 'destructive',
};

const DECISION_COLORS: Record<string, string> = {
  WRITE: 'text-green-600',
  SKIP: 'text-red-500',
  CONSIDER: 'text-yellow-600',
};

export default function SEOCenterPage() {
  const { content, keywords, settings, niche } = useWorkspace();
  const addKeyword = useWorkspace((s) => s.addKeyword);
  const [showSeedUpload, setShowSeedUpload] = useState(false);

  // Google Discover state
  const [googleQuery, setGoogleQuery] = useState('');
  const [googleResults, setGoogleResults] = useState<RankedKeyword[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleDiscover, setShowGoogleDiscover] = useState(false);

  const handleGoogleDiscover = useCallback(async () => {
    const query = googleQuery.trim() || niche || '';
    if (!query) return;

    setGoogleLoading(true);
    try {
      const suggestions = await fetchSuggestionsClient(query);
      const existingTitles = content.map((c) => c.title);
      const contentCount = content.length;
      const siteDA = contentCount >= 500 ? 50 : contentCount >= 200 ? 40 : contentCount >= 100 ? 35 : contentCount >= 50 ? 30 : contentCount >= 20 ? 25 : contentCount >= 10 ? 20 : 15;

      const positions: Record<string, number> = {};
      for (const s of suggestions) {
        positions[s.keyword.toLowerCase()] = s.position;
      }

      const ranked = rankKeywords(
        suggestions.map((s) => s.keyword),
        siteDA,
        existingTitles,
        positions,
      );
      setGoogleResults(ranked);
    } catch {
      // silently fail
    } finally {
      setGoogleLoading(false);
    }
  }, [googleQuery, niche, content]);

  const addGoogleKeyword = useCallback((rk: RankedKeyword) => {
    addKeyword({
      id: Date.now() + Math.random(),
      keyword: rk.keyword,
      term: rk.keyword,
      volume: rk.searchVolume,
      difficulty: rk.keywordDifficulty,
      status: rk.decision === 'WRITE' ? 'opportunity' : 'tracked',
      trend: 'stable',
    });
  }, [addKeyword]);

  const handleSeedImport = useCallback((seeds: SeedData) => {
    for (const kw of seeds.keywords) {
      addKeyword({
        id: Date.now() + Math.random(),
        keyword: kw.keyword,
        term: kw.keyword,
        volume: kw.volume ?? 0,
        difficulty: kw.difficulty ?? 50,
        cpc: kw.cpc,
        status: 'tracked',
        trend: 'stable',
      });
    }
    setShowSeedUpload(false);
  }, [addKeyword]);

  const published = useMemo(() => content.filter((c) => c.status === 'published'), [content]);
  const avgSeo = useMemo(() => {
    if (!content.length) return 0;
    return Math.round(content.reduce((s, c) => s + c.seoScore, 0) / content.length);
  }, [content]);
  const avgAi = useMemo(() => {
    if (!content.length) return 0;
    return Math.round(content.reduce((s, c) => s + c.aiScore, 0) / content.length);
  }, [content]);

  const lowSeo = useMemo(() => content.filter((c) => c.seoScore < 60).sort((a, b) => a.seoScore - b.seoScore), [content]);

  // ── GSC State ──
  const gscConnected = isGSCConnected(settings);
  const [gscQueryMap, setGscQueryMap] = useState<Record<string, GSCQuery>>({});
  const [gscContentMap, setGscContentMap] = useState<Record<string, { clicks: number; impressions: number; ctr: number; position: number }>>({});
  const [gscSyncing, setGscSyncing] = useState(false);
  const [gscSynced, setGscSynced] = useState(false);

  const syncFromGSC = useCallback(async () => {
    if (!settings.gscSiteUrl || !settings.gscRefreshToken) return;
    setGscSyncing(true);
    try {
      const range = dateRangeFromLabel('28d');
      const [queryRes, pageRes] = await Promise.all([
        fetchGSCData(settings.gscSiteUrl, range, ['query'], settings.gscRefreshToken),
        fetchGSCData(settings.gscSiteUrl, range, ['page'], settings.gscRefreshToken),
      ]);

      // Build lookup map: keyword -> GSC data
      const qMap: Record<string, GSCQuery> = {};
      for (const row of queryRes.rows as GSCQuery[]) {
        qMap[row.query.toLowerCase()] = row;
      }
      setGscQueryMap(qMap);

      // Build lookup map: page URL path -> GSC data
      const pMap: Record<string, { clicks: number; impressions: number; ctr: number; position: number }> = {};
      for (const row of pageRes.rows as unknown as Array<Record<string, unknown>>) {
        const pageUrl = String(row.page ?? '');
        const path = pageUrl.replace(/^https?:\/\/[^/]+/, '');
        pMap[path] = { clicks: Number(row.clicks), impressions: Number(row.impressions), ctr: Number(row.ctr), position: Number(row.position) };
      }
      setGscContentMap(pMap);
      setGscSynced(true);
    } catch {
      // silently fail — user can retry
    } finally {
      setGscSyncing(false);
    }
  }, [settings.gscSiteUrl, settings.gscRefreshToken]);

  // Auto-sync on mount if connected
  useEffect(() => {
    if (gscConnected && !gscSynced) {
      syncFromGSC();
    }
  }, [gscConnected, gscSynced, syncFromGSC]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-bold">SEO Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Track keywords and SEO scores across all content.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Avg SEO Score</p>
            <p className={`text-2xl font-bold ${scoreColor(avgSeo)}`}>{avgSeo}</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div className="h-2 rounded-full" style={{ width: `${avgSeo}%`, backgroundColor: scoreBg(avgSeo) }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Avg AI Score</p>
            <p className={`text-2xl font-bold ${scoreColor(avgAi)}`}>{avgAi}</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div className="h-2 rounded-full" style={{ width: `${avgAi}%`, backgroundColor: scoreBg(avgAi) }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="text-2xl font-bold">{published.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Keywords Tracked</p>
            <p className="text-2xl font-bold">{keywords.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="outline">Run SEO Audit</Button>
        <Button variant="outline">Fix All Issues</Button>
        <Button
          variant={showSeedUpload ? 'default' : 'outline'}
          onClick={() => setShowSeedUpload(!showSeedUpload)}
          className={showSeedUpload ? 'bg-blue-600 hover:bg-blue-500 text-white' : ''}
        >
          {showSeedUpload ? 'Close Upload' : 'Upload Keywords'}
        </Button>
        <Button
          variant={showGoogleDiscover ? 'default' : 'outline'}
          onClick={() => setShowGoogleDiscover(!showGoogleDiscover)}
          className={showGoogleDiscover ? 'bg-green-600 hover:bg-green-500 text-white' : ''}
        >
          {showGoogleDiscover ? 'Close Discovery' : 'Discover from Google'}
        </Button>
        {gscConnected ? (
          <Button variant="outline" onClick={syncFromGSC} disabled={gscSyncing}>
            {gscSyncing ? 'Syncing...' : 'Sync from GSC'}
          </Button>
        ) : (
          <a href="/api/gsc/auth" className={buttonVariants({ variant: 'outline' })}>Connect Search Console</a>
        )}
      </div>

      {/* Seed Data Upload Section */}
      {showSeedUpload && (
        <div className="mb-6">
          <SeedUploader
            onImport={handleSeedImport}
            existingKeywords={keywords.map((k) => k.keyword || k.term || '')}
          />
        </div>
      )}

      {/* Google Keyword Discovery */}
      {showGoogleDiscover && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">Google Keyword Intelligence (Free -- 0 Credits)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder={niche || 'Enter a seed keyword or topic...'}
                value={googleQuery}
                onChange={(e) => setGoogleQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGoogleDiscover()}
                className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
              />
              <Button onClick={handleGoogleDiscover} disabled={googleLoading}>
                {googleLoading ? 'Discovering...' : 'Discover'}
              </Button>
            </div>
            {googleResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3">Keyword</th>
                      <th className="pb-2 pr-3">Volume</th>
                      <th className="pb-2 pr-3">KD</th>
                      <th className="pb-2 pr-3">Intent</th>
                      <th className="pb-2 pr-3">Score</th>
                      <th className="pb-2 pr-3">Decision</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {googleResults.map((rk, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium max-w-[200px] truncate">{rk.keyword}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{rk.searchVolume.toLocaleString()}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1">
                            <div className="w-10 bg-muted rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${rk.keywordDifficulty}%`, backgroundColor: scoreBg(100 - rk.keywordDifficulty) }} />
                            </div>
                            <span className="font-mono text-xs">{rk.keywordDifficulty}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3"><Badge variant="outline" className="text-xs">{rk.intent}</Badge></td>
                        <td className={`py-2 pr-3 font-mono font-bold ${scoreColor(rk.rankabilityScore)}`}>{rk.rankabilityScore}</td>
                        <td className={`py-2 pr-3 font-bold text-xs ${DECISION_COLORS[rk.decision] || ''}`}>{rk.decision}</td>
                        <td className="py-2">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addGoogleKeyword(rk)}>
                            + Track
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-3">
                  {googleResults.filter((r) => r.decision === 'WRITE').length} keywords recommended to WRITE |
                  {' '}{googleResults.filter((r) => r.decision === 'CONSIDER').length} to CONSIDER |
                  {' '}{googleResults.filter((r) => r.decision === 'SKIP').length} to SKIP
                </p>
              </div>
            )}
            {googleResults.length === 0 && !googleLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Enter a keyword or topic and click Discover to get real Google suggestions with AI-free scoring.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Health */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">Content Health ({lowSeo.length} issue{lowSeo.length !== 1 ? 's' : ''})</CardTitle></CardHeader>
        <CardContent>
          {lowSeo.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">All content has SEO scores above 60. Great job!</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">SEO</th>
                  <th className="pb-2 pr-4">AI</th>
                  <th className="pb-2 pr-4">Status</th>
                  {gscSynced && <th className="pb-2 pr-4">CTR</th>}
                </tr>
              </thead>
              <tbody>
                {lowSeo.map((item) => {
                  const slug = item.slug ? `/${item.slug}` : '';
                  const gscData = slug ? gscContentMap[slug] : undefined;
                  return (
                    <tr key={item.id} className="border-b last:border-0 bg-red-500/5">
                      <td className="py-2 pr-4 font-medium">{item.title || 'Untitled'}</td>
                      <td className={`py-2 pr-4 font-mono font-bold ${scoreColor(item.seoScore)}`}>{item.seoScore}</td>
                      <td className={`py-2 pr-4 font-mono ${scoreColor(item.aiScore)}`}>{item.aiScore}</td>
                      <td className="py-2 pr-4"><Badge variant="secondary">{item.status}</Badge></td>
                      {gscSynced && <td className="py-2 pr-4 font-mono text-xs">{gscData ? `${gscData.ctr}%` : '-'}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Tracked Keywords ({keywords.length})</CardTitle></CardHeader>
        <CardContent>
          {keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No keywords tracked yet. Add keywords from the content editor.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Keyword</th>
                  <th className="pb-2 pr-4">Volume</th>
                  <th className="pb-2 pr-4">Difficulty</th>
                  <th className="pb-2 pr-4">Position</th>
                  {gscSynced && <th className="pb-2 pr-4">GSC Pos</th>}
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw) => {
                  const kwText = (kw.keyword || kw.term || '').toLowerCase();
                  const gscData = gscQueryMap[kwText];
                  return (
                    <tr key={kw.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{kw.keyword || kw.term}</td>
                      <td className="py-2 pr-4 font-mono">{kw.volume?.toLocaleString() || '-'}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div className="h-2 rounded-full" style={{ width: `${kw.difficulty}%`, backgroundColor: scoreBg(100 - kw.difficulty) }} />
                          </div>
                          <span className="font-mono text-xs">{kw.difficulty}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 font-mono">{kw.position || kw.pos || '-'}</td>
                      {gscSynced && (
                        <td className="py-2 pr-4 font-mono">
                          {gscData ? (
                            <span className={gscData.position <= 10 ? 'text-green-600 font-bold' : gscData.position <= 20 ? 'text-yellow-600' : 'text-muted-foreground'}>
                              {gscData.position}
                            </span>
                          ) : '-'}
                        </td>
                      )}
                      <td className="py-2 pr-4"><Badge variant={STATUS_VARIANT[kw.status] || 'secondary'}>{kw.status}</Badge></td>
                      <td className="py-2">
                        <span className={kw.trend === 'up' ? 'text-green-600' : kw.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}>
                          {TREND_ICON[kw.trend || 'stable'] || '\u2192'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
