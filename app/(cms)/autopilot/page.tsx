'use client';

import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { SeedUploader } from '@/components/SeedUploader';
import type { SeedData } from '@/lib/autopilot/seed';
import { ActivationSequence } from '@/components/ActivationSequence';
import { discoverKeywords, planContent, generateDraft } from '@/lib/autopilot/engine';

/* ─── Helpers ────────────────────────────────────────────────── */

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

const PHASE_FILTERS = ['All', 'Discovery', 'Planning', 'Generation', 'Optimization', 'Monitoring'] as const;
type PhaseFilter = (typeof PHASE_FILTERS)[number];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
];

const CONTENT_GOALS = [
  { value: 'traffic', label: 'Traffic', desc: 'Maximize organic visitors' },
  { value: 'authority', label: 'Authority', desc: 'Build topical authority' },
  { value: 'conversion', label: 'Conversion', desc: 'Drive signups and sales' },
] as const;

/* ─── Autopilot Configuration Page ───────────────────────────── */

export default function AutopilotPage() {
  const {
    autopilot, setAutopilot, settings, setSettings, agents, keywords,
    autopilotEngineConfig, autopilotEngineState, updateAutopilotEngineState,
    addDiscoveredKeywords, addPlannedContent, addGeneratedDraft, content,
  } = useWorkspace();
  const addKeyword = useWorkspace((s) => s.addKeyword);
  const agentHistory = agents?.history ?? [];

  /* Seed data import handler */
  const seedKeywordCount = useMemo(() => {
    return keywords.filter((k) => {
      const src = (k as unknown as Record<string, unknown>).source;
      return typeof src === 'string' && ['csv-upload', 'manual', 'ahrefs', 'semrush', 'gkp', 'json-upload', 'text-upload'].includes(src);
    }).length;
  }, [keywords]);

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
  }, [addKeyword]);

  /* Local form state */
  const [niche, setNiche] = useState(settings?.niche ?? '');
  const [targetAudience, setTargetAudience] = useState((settings as unknown as Record<string, unknown>)?.targetAudience as string ?? '');
  const [contentGoal, setContentGoal] = useState<string>((settings as unknown as Record<string, unknown>)?.contentGoal as string ?? 'traffic');
  const [language, setLanguage] = useState(settings?.defaultLang ?? 'en');
  const [dailyBudget, setDailyBudget] = useState(autopilot?.creditBudget?.daily ?? 10);
  const [autoPublish, setAutoPublish] = useState(autopilot?.rules?.auto_publish ?? false);
  const [competitors, setCompetitors] = useState<string[]>(
    ((settings as unknown as Record<string, unknown>)?.competitors as string[]) ?? []
  );
  const [newCompetitor, setNewCompetitor] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('All');
  const [saved, setSaved] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  const isEnabled = autopilot?.enabled ?? false;
  const apStats = autopilot?.stats ?? { total_runs: 0, total_credits: 0, articles_created: 0, issues_fixed: 0, distributions: 0 };
  const apBudget = autopilot?.creditBudget ?? { daily: 10, used_today: 0, weekly: 50, used_week: 0 };

  /* Filtered activity log */
  const filteredLog = useMemo(() => {
    if (phaseFilter === 'All') return agentHistory;
    const filterLower = phaseFilter.toLowerCase();
    return agentHistory.filter((entry) => {
      const action = entry.action.toLowerCase();
      if (filterLower === 'discovery') return action.includes('keyword') || action.includes('discover');
      if (filterLower === 'planning') return action.includes('plan') || action.includes('queue') || action.includes('schedule');
      if (filterLower === 'generation') return action.includes('draft') || action.includes('generat') || action.includes('writ');
      if (filterLower === 'optimization') return action.includes('seo') || action.includes('meta') || action.includes('fix') || action.includes('optimi');
      if (filterLower === 'monitoring') return action.includes('alert') || action.includes('monitor') || action.includes('check') || action.includes('performance');
      return true;
    });
  }, [agentHistory, phaseFilter]);

  /* Weekly stats */
  const weekHistory = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return agentHistory.filter((h) => h.ts > cutoff);
  }, [agentHistory]);
  const keywordsThisWeek = useMemo(
    () => weekHistory.filter((h) => h.action.toLowerCase().includes('keyword') || h.action.toLowerCase().includes('discover')).length,
    [weekHistory]
  );
  const contentThisWeek = useMemo(
    () => weekHistory.filter((h) => h.action.toLowerCase().includes('draft') || h.action.toLowerCase().includes('generat')).length,
    [weekHistory]
  );
  const fixesThisWeek = useMemo(
    () => weekHistory.filter((h) => h.action.toLowerCase().includes('fix') || h.action.toLowerCase().includes('seo')).length,
    [weekHistory]
  );
  const creditsRemaining = Math.max(0, (apBudget.daily ?? 10) - (apBudget.used_today ?? 0));

  /* Handlers */
  function handleSaveConfig() {
    // Use a partial update — extra fields are persisted by the store's spread operator
    const updatedSettings: Record<string, unknown> = {
      niche,
      defaultLang: language,
      targetAudience,
      contentGoal,
      competitors,
    };
    setSettings(updatedSettings as Partial<typeof settings>);

    setAutopilot({
      creditBudget: { ...autopilot.creditBudget, daily: dailyBudget },
      rules: { ...autopilot.rules, auto_publish: autoPublish },
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success('Autopilot configuration saved');
  }

  function handleToggleAutopilot() {
    const next = !isEnabled;
    setAutopilot({ enabled: next });
    toast.success(next ? 'Autopilot enabled' : 'Autopilot paused');
  }

  function handleAddCompetitor() {
    const domain = newCompetitor.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (domain && competitors.length < 5 && !competitors.includes(domain)) {
      setCompetitors([...competitors, domain]);
      setNewCompetitor('');
    }
  }

  function handleRemoveCompetitor(domain: string) {
    setCompetitors(competitors.filter((c) => c !== domain));
  }

  function buildConfig() {
    return autopilotEngineConfig ?? {
      niche: niche || settings?.niche || '',
      domain: (settings as unknown as Record<string, string>)?.siteDomain ?? '',
      language: settings?.defaultLang ?? 'en',
      targetAudience: targetAudience || '',
      contentGoal: (contentGoal || 'traffic') as 'traffic' | 'authority' | 'conversion',
      dailyBudget: autopilot?.creditBudget?.daily ?? 10,
      autoPublish: autoPublish,
      competitors: competitors,
    };
  }

  async function handleRunDiscovery() {
    if (!niche && !settings?.niche) {
      toast.error('Set your niche before running discovery');
      return;
    }
    setDiscoveryLoading(true);
    try {
      const config = buildConfig();
      const existingKws = keywords.map((k) => k.keyword || k.term || '');
      const aiSettings = settings as unknown as Record<string, string>;
      const discovered = await discoverKeywords(config, existingKws, aiSettings);
      if (discovered.length > 0) {
        addDiscoveredKeywords(discovered);
        toast.success(`Discovered ${discovered.length} keywords`);
      } else {
        toast.info('No new keywords discovered');
      }
    } catch (err) {
      toast.error(`Discovery failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDiscoveryLoading(false);
    }
  }

  async function handleGenerateContent() {
    setGenerateLoading(true);
    try {
      const config = buildConfig();
      const aiSettings = settings as unknown as Record<string, string>;
      const kwSuggestions = autopilotEngineState.discoveredKeywords;

      // Plan content first
      const plans = await planContent(config, kwSuggestions, content, 3, aiSettings);
      if (plans.length > 0) {
        addPlannedContent(plans);
        toast.success(`Planned ${plans.length} articles`);

        // Generate a draft for the first plan
        const draft = await generateDraft(plans[0], config, content, aiSettings);
        if (draft) {
          addGeneratedDraft(draft);
          toast.success(`Draft generated: ${draft.title}`);
        }
      } else {
        toast.info('No content plans generated. Run discovery first.');
      }
    } catch (err) {
      toast.error(`Generation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerateLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Autopilot</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure autonomous content operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={isEnabled ? 'default' : 'secondary'}
            className={`text-xs ${isEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-muted-foreground'}`}
          >
            {isEnabled ? 'ACTIVE' : 'PAUSED'}
          </Badge>
          <Button
            onClick={handleToggleAutopilot}
            variant={isEnabled ? 'outline' : 'default'}
            className={isEnabled ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}
          >
            {isEnabled ? 'Pause Autopilot' : 'Resume Autopilot'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Configuration (2/3) ────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Configuration Form */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Niche */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Niche
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g., Personal Finance India"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Young professionals 25-35"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
                />
              </div>

              {/* Content Goal */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Content Goal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CONTENT_GOALS.map((goal) => (
                    <button
                      key={goal.value}
                      onClick={() => setContentGoal(goal.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        contentGoal === goal.value
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-border hover:border-blue-500/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`text-sm font-semibold ${contentGoal === goal.value ? 'text-blue-400' : 'text-foreground'}`}>
                        {goal.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{goal.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>

              {/* Daily AI Budget */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Daily AI Budget: <span className="text-foreground font-bold">{dailyBudget} credits</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>5</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {/* Auto-publish */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-foreground">Auto-publish</span>
                  <p className="text-[11px] text-muted-foreground">Publish content automatically when quality gates pass</p>
                </div>
                <button
                  onClick={() => setAutoPublish(!autoPublish)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoPublish ? 'bg-emerald-500' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      autoPublish ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Competitor Domains */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Competitor Domains <span className="text-muted-foreground/50">(up to 5)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCompetitor(); } }}
                    placeholder="example.com"
                    disabled={competitors.length >= 5}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 disabled:opacity-50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddCompetitor}
                    disabled={competitors.length >= 5 || !newCompetitor.trim()}
                    className="border-border hover:border-blue-500/50"
                  >
                    Add
                  </Button>
                </div>
                {competitors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {competitors.map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs gap-1.5 pr-1">
                        {c}
                        <button
                          onClick={() => handleRemoveCompetitor(c)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          x
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-500 text-white">
                  Save Configuration
                </Button>
                {saved && <span className="text-xs text-emerald-400">Saved!</span>}
              </div>
            </CardContent>
          </Card>

          {/* Seed Data */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Seed Data</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {seedKeywordCount} uploaded
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {keywords.length - seedKeywordCount} discovered
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload your existing research to jumpstart the autopilot
              </p>
            </CardHeader>
            <CardContent>
              <SeedUploader
                onImport={handleSeedImport}
                existingKeywords={keywords.map((k) => k.keyword || k.term || '')}
              />
            </CardContent>
          </Card>

          {/* Control Buttons */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Manual Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  disabled={discoveryLoading}
                  onClick={handleRunDiscovery}
                >
                  <span className="mr-2">{'\uD83D\uDD0D'}</span>
                  {discoveryLoading ? 'Discovering...' : 'Run Discovery Now'}
                </Button>
                <Button
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  disabled={generateLoading}
                  onClick={handleGenerateContent}
                >
                  <span className="mr-2">{'\u270D\uFE0F'}</span>
                  {generateLoading ? 'Generating...' : 'Generate Content'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleToggleAutopilot}
                  className={isEnabled
                    ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                    : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }
                >
                  {isEnabled ? 'Pause Autopilot' : 'Resume Autopilot'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowActivation(true)}
                  disabled={!niche}
                  className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                >
                  Re-run Activation
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold">Activity Log</CardTitle>
                <div className="flex items-center gap-1">
                  {PHASE_FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setPhaseFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                        phaseFilter === f
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredLog.length > 0 ? (
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {filteredLog.map((entry, i) => (
                    <div
                      key={`${entry.ts}-${i}`}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-[10px] text-muted-foreground/50 font-mono whitespace-nowrap mt-0.5 w-16 shrink-0">
                        {relativeTime(entry.ts)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{entry.action}</p>
                        {entry.creditsUsed > 0 && (
                          <span className="text-[10px] text-muted-foreground/50 font-mono">{entry.creditsUsed} credits</span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[8px] shrink-0">{entry.agentId}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No activity yet. Enable the autopilot and agents will begin working.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Stats (1/3) ───────────────────────── */}
        <div className="space-y-4">
          {/* Weekly Stats */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">This Week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Keywords discovered</span>
                <span className="text-sm font-bold text-foreground">{keywordsThisWeek}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Content generated</span>
                <span className="text-sm font-bold text-foreground">{contentThisWeek}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">SEO fixes applied</span>
                <span className="text-sm font-bold text-foreground">{fixesThisWeek}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Credits remaining today</span>
                <span className={`text-sm font-bold ${creditsRemaining <= 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {creditsRemaining}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Lifetime Stats */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Lifetime Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total runs</span>
                <span className="text-sm font-bold text-foreground">{apStats.total_runs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Articles created</span>
                <span className="text-sm font-bold text-foreground">{apStats.articles_created}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Issues fixed</span>
                <span className="text-sm font-bold text-foreground">{apStats.issues_fixed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Distributions</span>
                <span className="text-sm font-bold text-foreground">{apStats.distributions}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total credits used</span>
                <span className="text-sm font-bold text-foreground">{apStats.total_credits}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">How Autopilot Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">{'\uD83D\uDD0D'}</span>
                  <span><strong className="text-foreground">Discovery</strong> &mdash; Finds keyword opportunities in your niche</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-violet-400 shrink-0">{'\uD83D\uDCDD'}</span>
                  <span><strong className="text-foreground">Planning</strong> &mdash; Creates a content calendar based on gaps</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">{'\u270D\uFE0F'}</span>
                  <span><strong className="text-foreground">Generation</strong> &mdash; Writes SEO-optimized drafts</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">{'\uD83D\uDD27'}</span>
                  <span><strong className="text-foreground">Optimization</strong> &mdash; Fixes SEO issues and interlinks</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">{'\uD83D\uDCCA'}</span>
                  <span><strong className="text-foreground">Monitoring</strong> &mdash; Tracks performance and alerts on drops</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Re-run Activation overlay */}
      {showActivation && (
        <ActivationSequence
          niche={niche || settings?.niche || 'Technology'}
          domain={(settings as unknown as Record<string, string>)?.siteDomain ?? ''}
          competitors={competitors}
          language={language}
          targetAudience={targetAudience}
          contentGoal={contentGoal}
          onComplete={() => setShowActivation(false)}
        />
      )}
    </div>
  );
}
