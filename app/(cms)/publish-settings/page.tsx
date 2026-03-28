'use client';

import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { PublishPlatform, PublishLimits } from '@/lib/agents/autopublish';
import { runQualityGates, getPublishStats } from '@/lib/agents/autopublish';

// ---------------------------------------------------------------------------
// Timezone options
// ---------------------------------------------------------------------------

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PublishSettingsPage() {
  const {
    publishLimits,
    setPublishLimits,
    publishLog,
    content,
  } = useWorkspace();

  // Local editable state
  const [limits, setLimits] = useState<PublishLimits>(publishLimits);
  const [wpUrl, setWpUrl] = useState('');
  const [ipUrl, setIpUrl] = useState('');
  const [dirty, setDirty] = useState(false);

  const stats = useMemo(() => getPublishStats(content), [content]);

  // Content held for review (failed gates)
  const heldContent = useMemo(
    () => content.filter((c) => c.status === 'review'),
    [content],
  );

  // Recent publish log
  const recentLog = useMemo(() => publishLog.slice(0, 20), [publishLog]);

  // Helpers
  function update(patch: Partial<PublishLimits>) {
    setLimits((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  function togglePlatform(platform: PublishPlatform) {
    const current = limits.enabledPlatforms;
    const next = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    // Conduit is always on
    if (!next.includes('conduit')) next.unshift('conduit');
    update({ enabledPlatforms: next });
  }

  function save() {
    setPublishLimits(limits);
    setDirty(false);
    toast.success('Publish settings saved');
  }

  function retryContent(id: number) {
    const item = content.find((c) => c.id === id);
    if (!item) return;
    const decision = runQualityGates(item, limits, stats.today, stats.thisWeek, content);
    if (decision.canAutoPublish) {
      toast.success(`"${item.title}" passes all gates now`);
    } else {
      toast.error(`Still blocked: ${decision.blockers[0] || 'Unknown'}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Publishing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure auto-publish quality gates, rate limits, and platforms
          </p>
        </div>
        <Button
          onClick={save}
          disabled={!dirty}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          Save Settings
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-emerald-500">
          <CardContent className="p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Published Today</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {stats.today}<span className="text-sm text-muted-foreground font-normal">/{limits.maxPerDay}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-blue-500">
          <CardContent className="p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">This Week</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {stats.thisWeek}<span className="text-sm text-muted-foreground font-normal">/{limits.maxPerWeek}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-violet-500">
          <CardContent className="p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">This Month</span>
            <div className="text-2xl font-bold text-violet-400 mt-1">{stats.thisMonth}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur border-border border-l-[3px] border-l-amber-500">
          <CardContent className="p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Held for Review</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{heldContent.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings */}
        <div className="lg:col-span-2 space-y-6">

          {/* Master Switch */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Auto-Publish</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    When enabled, content that passes all quality gates is published automatically
                  </p>
                </div>
                <button
                  onClick={() => update({ autoPublishEnabled: !limits.autoPublishEnabled })}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    limits.autoPublishEnabled ? 'bg-emerald-500' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                      limits.autoPublishEnabled ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <Badge
                className={`mt-3 text-xs ${
                  limits.autoPublishEnabled
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {limits.autoPublishEnabled ? 'AUTO-PUBLISH ON' : 'AUTO-PUBLISH OFF'}
              </Badge>
            </CardContent>
          </Card>

          {/* Quality Gates */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Quality Gates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* SEO Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-foreground">Min SEO Score</label>
                  <span className="text-sm font-mono text-muted-foreground">{limits.minSEOScore}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={limits.minSEOScore}
                  onChange={(e) => update({ minSEOScore: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* AI Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-foreground">Min AI Quality Score</label>
                  <span className="text-sm font-mono text-muted-foreground">{limits.minAIScore}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={limits.minAIScore}
                  onChange={(e) => update({ minAIScore: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Readability */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-foreground">Min Readability (Flesch-Kincaid)</label>
                  <span className="text-sm font-mono text-muted-foreground">{limits.minReadability}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={limits.minReadability}
                  onChange={(e) => update({ minReadability: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Word Count */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-foreground block mb-1.5">Min Word Count</label>
                  <Input
                    type="number"
                    value={limits.minWordCount}
                    onChange={(e) => update({ minWordCount: Number(e.target.value) })}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground block mb-1.5">Max Word Count</label>
                  <Input
                    type="number"
                    value={limits.maxWordCount}
                    onChange={(e) => update({ maxWordCount: Number(e.target.value) })}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Headings & Links */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-foreground block mb-1.5">Min H2 Headings</label>
                  <Input
                    type="number"
                    value={limits.requireMinHeadings}
                    onChange={(e) => update({ requireMinHeadings: Number(e.target.value) })}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground block mb-1.5">Min Internal Links</label>
                  <Input
                    type="number"
                    value={limits.requireInternalLinks}
                    onChange={(e) => update({ requireInternalLinks: Number(e.target.value) })}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                {[
                  { key: 'requireFeaturedImage' as const, label: 'Require Featured Image' },
                  { key: 'requireMetaTitle' as const, label: 'Require Meta Title' },
                  { key: 'requireMetaDesc' as const, label: 'Require Meta Description' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-foreground">{label}</label>
                    <button
                      onClick={() => update({ [key]: !limits[key] })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        limits[key] ? 'bg-blue-500' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          limits[key] ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Rate Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-foreground block mb-1.5">Max Per Day</label>
                  <Input
                    type="number"
                    value={limits.maxPerDay}
                    onChange={(e) => update({ maxPerDay: Number(e.target.value) })}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground block mb-1.5">Max Per Week</label>
                  <Input
                    type="number"
                    value={limits.maxPerWeek}
                    onChange={(e) => update({ maxPerWeek: Number(e.target.value) })}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-foreground block mb-1.5">Publish Start Hour</label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={limits.publishHoursStart}
                    onChange={(e) => update({ publishHoursStart: Number(e.target.value) })}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground block mb-1.5">Publish End Hour</label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={limits.publishHoursEnd}
                    onChange={(e) => update({ publishHoursEnd: Number(e.target.value) })}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground block mb-1.5">Timezone</label>
                  <select
                    value={limits.publishTimezone}
                    onChange={(e) => update({ publishTimezone: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platforms */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Platforms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { id: 'conduit' as PublishPlatform, label: 'Conduit CMS', desc: 'Always on', locked: true },
                { id: 'investingpro' as PublishPlatform, label: 'InvestingPro.in', desc: 'Webhook URL required' },
                { id: 'wordpress' as PublishPlatform, label: 'WordPress', desc: 'Webhook URL required' },
                { id: 'twitter' as PublishPlatform, label: 'Twitter / X', desc: 'OAuth required' },
                { id: 'linkedin' as PublishPlatform, label: 'LinkedIn', desc: 'OAuth required' },
                { id: 'rss' as PublishPlatform, label: 'RSS Feed', desc: 'Auto-generated' },
              ].map((platform) => (
                <div key={platform.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => !platform.locked && togglePlatform(platform.id)}
                      disabled={platform.locked}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        limits.enabledPlatforms.includes(platform.id) ? 'bg-emerald-500' : 'bg-muted'
                      } ${platform.locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          limits.enabledPlatforms.includes(platform.id) ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <div>
                      <span className="text-sm font-medium text-foreground">{platform.label}</span>
                      <p className="text-[10px] text-muted-foreground">{platform.desc}</p>
                    </div>
                  </div>
                  {limits.enabledPlatforms.includes(platform.id) && (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">
                      Active
                    </Badge>
                  )}
                </div>
              ))}

              {/* Webhook URLs */}
              {limits.enabledPlatforms.includes('investingpro') && (
                <div className="mt-3">
                  <label className="text-sm text-foreground block mb-1.5">InvestingPro Webhook URL</label>
                  <Input
                    placeholder="https://investingpro.in/api/conduit-webhook"
                    value={ipUrl}
                    onChange={(e) => setIpUrl(e.target.value)}
                    className="bg-background"
                  />
                </div>
              )}
              {limits.enabledPlatforms.includes('wordpress') && (
                <div className="mt-3">
                  <label className="text-sm text-foreground block mb-1.5">WordPress Webhook URL</label>
                  <Input
                    placeholder="https://yoursite.com/wp-json/conduit/v1/publish"
                    value={wpUrl}
                    onChange={(e) => setWpUrl(e.target.value)}
                    className="bg-background"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Log + Held */}
        <div className="space-y-6">

          {/* Held for Review */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Held for Review</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {heldContent.length > 0 ? (
                <div className="space-y-2">
                  {heldContent.slice(0, 10).map((item) => {
                    const logEntry = publishLog.find((l) => l.contentId === item.id && l.held);
                    const failedGates = logEntry?.gateResults.filter((g) => !g.passed && g.severity === 'blocker') || [];
                    return (
                      <div key={item.id} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        {failedGates.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {failedGates.map((g, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] bg-rose-500/10 text-rose-400 border-rose-500/25">
                                {g.gate}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {logEntry?.holdReason && (
                          <p className="text-[10px] text-muted-foreground mt-1.5">{logEntry.holdReason}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Link href={`/editor`}>
                            <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 border-border">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6 px-2 border-blue-500/30 text-blue-400"
                            onClick={() => retryContent(item.id)}
                          >
                            Re-check Gates
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <span className="text-emerald-400 text-sm">{'\u2713'}</span>
                  <span className="text-xs text-emerald-400">No content held for review</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Publish Log */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Publish Log</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentLog.length > 0 ? (
                <div className="space-y-1.5">
                  {recentLog.map((entry, i) => (
                    <div
                      key={`${entry.contentId}-${i}`}
                      className={`p-2.5 rounded-lg border ${
                        entry.held
                          ? 'border-amber-500/20 bg-amber-500/5'
                          : 'border-emerald-500/20 bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate flex-1">{entry.title}</p>
                        <Badge
                          className={`text-[9px] shrink-0 ${
                            entry.held
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {entry.held ? 'Held' : 'Published'}
                        </Badge>
                      </div>
                      {entry.platforms.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {entry.platforms.map((p) => (
                            <Badge key={p} variant="outline" className="text-[9px] text-muted-foreground">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 font-mono mt-1">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">No publish activity yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
