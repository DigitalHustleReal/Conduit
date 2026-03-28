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

export default function SEOCenterPage() {
  const { content, keywords, settings } = useWorkspace();
  const addKeyword = useWorkspace((s) => s.addKeyword);
  const [showSeedUpload, setShowSeedUpload] = useState(false);

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
