'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { discoverKeywords, planContent, generateDraft } from '@/lib/autopilot/engine';
import type {
  AutopilotEngineConfig,
  KeywordSuggestion,
  ContentPlan,
  DraftContent,
} from '@/lib/autopilot/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivationSequenceProps {
  niche: string;
  domain: string;
  competitors: string[];
  language: string;
  targetAudience: string;
  contentGoal: string;
  /** Called when the entire sequence finishes (success or partial). */
  onComplete: () => void;
}

type Phase = 'boot' | 'keywords' | 'planning' | 'drafting' | 'agents' | 'online' | 'done';

interface PhaseError {
  phase: Phase;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_NAMES = [
  'Content Autopilot',
  'SEO Guardian',
  'Keyword Opportunity',
  'Pipeline Manager',
  'Smart Onboarding',
  'Health Monitor',
  'Content Refresh',
  'Interlink Builder',
] as const;

const NAV_ITEMS = [
  'Dashboard', 'Editor', 'Keywords', 'Pipeline', 'Analytics',
  'AI Studio', 'Agents', 'Autopilot', 'Media', 'Settings',
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivationSequence({
  niche,
  domain,
  competitors,
  language,
  targetAudience,
  contentGoal,
  onComplete,
}: ActivationSequenceProps) {
  const hasStarted = useRef(false);

  // Store actions
  const settings = useWorkspace((s) => s.settings);
  const addDiscoveredKeywords = useWorkspace((s) => s.addDiscoveredKeywords);
  const addPlannedContent = useWorkspace((s) => s.addPlannedContent);
  const addGeneratedDraft = useWorkspace((s) => s.addGeneratedDraft);
  const addKeyword = useWorkspace((s) => s.addKeyword);
  const addContent = useWorkspace((s) => s.addContent);
  const addPipelineItem = useWorkspace((s) => s.addPipelineItem);
  const deductCredit = useWorkspace((s) => s.deductCredit);

  // Phase state
  const [phase, setPhase] = useState<Phase>('boot');
  const [errors, setErrors] = useState<PhaseError[]>([]);

  // Boot
  const [bootText, setBootText] = useState('');
  const [navLit, setNavLit] = useState(0); // count of nav items lit

  // Keywords
  const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
  const [keywordsDone, setKeywordsDone] = useState(false);

  // Planning
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [plansDone, setPlansDone] = useState(false);

  // Drafting
  const [draftTitle, setDraftTitle] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [seoScore, setSeoScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [draftDone, setDraftDone] = useState(false);
  const draftRef = useRef<DraftContent | null>(null);

  // Agents
  const [agentsOnline, setAgentsOnline] = useState(0);

  // Summary
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // Progress (0-100)
  const progressMap: Record<Phase, number> = {
    boot: 5,
    keywords: 25,
    planning: 50,
    drafting: 75,
    agents: 90,
    online: 100,
    done: 100,
  };

  // ---------------------------------------------------------------------------
  // Engine config
  // ---------------------------------------------------------------------------

  const engineConfig: AutopilotEngineConfig = {
    niche,
    domain,
    language,
    targetAudience: targetAudience || 'general audience',
    contentGoal: contentGoal as 'traffic' | 'authority' | 'conversion',
    dailyBudget: 10,
    autoPublish: false,
    competitors,
  };

  // Build settings record for AI calls
  const aiSettings = useRef<Record<string, string>>({});
  useEffect(() => {
    const s: Record<string, string> = {};
    if (settings.aiProvider) s.aiProvider = settings.aiProvider;
    if (settings.aiModel) s.aiModel = settings.aiModel;
    const keys = ['openaiKey', 'geminiKey', 'mistralKey', 'groqKey', 'anthropicKey'] as const;
    for (const k of keys) {
      const val = (settings as unknown as Record<string, unknown>)[k];
      if (typeof val === 'string' && val) s[k] = val;
    }
    aiSettings.current = s;
  }, [settings]);

  // ---------------------------------------------------------------------------
  // Typewriter helper
  // ---------------------------------------------------------------------------

  const typeText = useCallback(
    (text: string, setter: (v: string) => void, speed = 30): Promise<void> => {
      return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
          i++;
          setter(text.slice(0, i));
          if (i >= text.length) {
            clearInterval(interval);
            resolve();
          }
        }, speed);
      });
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Main sequence
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function run() {
      // ----- Phase 1: Boot -----
      setPhase('boot');
      await typeText('Initializing Conduit Engine...', setBootText, 25);

      // Light up nav items sequentially
      for (let i = 0; i < NAV_ITEMS.length; i++) {
        await delay(60);
        setNavLit(i + 1);
      }
      await delay(200);

      // ----- Phase 2: Keyword Discovery (REAL AI call) -----
      setPhase('keywords');
      let discoveredKw: KeywordSuggestion[] = [];
      try {
        discoveredKw = await discoverKeywords(engineConfig, [], aiSettings.current);

        // Stream them in one by one
        for (let i = 0; i < discoveredKw.length; i++) {
          await delay(150);
          setKeywords((prev) => [...prev, discoveredKw[i]]);
        }

        // Save to store
        addDiscoveredKeywords(discoveredKw);
        for (const kw of discoveredKw) {
          addKeyword({
            id: Date.now() + Math.random(),
            keyword: kw.keyword,
            term: kw.keyword,
            volume: kw.estimatedVolume === 'high' ? 5000 : kw.estimatedVolume === 'medium' ? 1000 : 200,
            difficulty: kw.estimatedDifficulty === 'high' ? 80 : kw.estimatedDifficulty === 'medium' ? 50 : 20,
            status: 'opportunity',
            trend: 'stable',
          });
        }
        deductCredit('aiCalls');
        setCreditsUsed((c) => c + 1);
      } catch (err) {
        setErrors((prev) => [
          ...prev,
          { phase: 'keywords', message: err instanceof Error ? err.message : 'Keyword discovery failed' },
        ]);
      }
      setKeywordsDone(true);
      await delay(400);

      // ----- Phase 3: Content Planning (REAL AI call) -----
      setPhase('planning');
      let plannedItems: ContentPlan[] = [];
      if (discoveredKw.length > 0) {
        try {
          plannedItems = await planContent(engineConfig, discoveredKw, [], 3, aiSettings.current);

          // Stream plans one by one
          for (let i = 0; i < plannedItems.length; i++) {
            await delay(300);
            setPlans((prev) => [...prev, plannedItems[i]]);
          }

          // Save to store
          addPlannedContent(plannedItems);
          for (const plan of plannedItems) {
            addPipelineItem({
              id: Date.now() + Math.random(),
              title: plan.title,
              keyword: plan.keyword,
              stage: 'backlog',
              assignee: 'AI Autopilot',
              priority: plan.priority,
              updated: Date.now(),
            });
          }
          deductCredit('aiCalls');
          setCreditsUsed((c) => c + 1);
        } catch (err) {
          setErrors((prev) => [
            ...prev,
            { phase: 'planning', message: err instanceof Error ? err.message : 'Content planning failed' },
          ]);
        }
      } else {
        setErrors((prev) => [
          ...prev,
          { phase: 'planning', message: 'Skipped: no keywords discovered' },
        ]);
      }
      setPlansDone(true);
      await delay(400);

      // ----- Phase 4: First Draft (REAL AI call) -----
      setPhase('drafting');
      if (plannedItems.length > 0) {
        setDraftTitle(plannedItems[0].title);
        try {
          // Start a word count ticker
          const tickerInterval = setInterval(() => {
            setWordCount((prev) => {
              // Simulate progressive word count while AI generates
              if (prev < 200) return prev + Math.floor(Math.random() * 30 + 10);
              if (prev < 800) return prev + Math.floor(Math.random() * 50 + 20);
              if (prev < 1500) return prev + Math.floor(Math.random() * 40 + 15);
              return prev + Math.floor(Math.random() * 20 + 5);
            });
          }, 400);

          const draft = await generateDraft(plannedItems[0], engineConfig, [], aiSettings.current);
          clearInterval(tickerInterval);
          draftRef.current = draft;

          // Set final real values
          setWordCount(draft.wordCount);
          setSeoScore(draft.seoScore);
          setAiScore(draft.aiScore);

          // Save to store
          addGeneratedDraft(draft);
          addContent({
            id: Date.now(),
            title: draft.title,
            slug: draft.slug,
            content: draft.body,
            body: draft.body,
            keyword: draft.keyword,
            metaTitle: draft.metaTitle,
            metaDescription: draft.metaDescription,
            status: 'draft',
            wordCount: draft.wordCount,
            aiScore: draft.aiScore,
            seoScore: draft.seoScore,
            created: Date.now(),
            updated: Date.now(),
          });
          deductCredit('aiCalls');
          setCreditsUsed((c) => c + 1);
        } catch (err) {
          setErrors((prev) => [
            ...prev,
            { phase: 'drafting', message: err instanceof Error ? err.message : 'Draft generation failed' },
          ]);
        }
      } else {
        setErrors((prev) => [
          ...prev,
          { phase: 'drafting', message: 'Skipped: no content plans available' },
        ]);
      }
      setDraftDone(true);
      await delay(400);

      // ----- Phase 5: Agents Online -----
      setPhase('agents');
      for (let i = 0; i < AGENT_NAMES.length; i++) {
        await delay(100);
        setAgentsOnline(i + 1);
      }
      await delay(300);

      // ----- Phase 6: System Online -----
      setPhase('online');
      await delay(1500);

      // ----- Done -----
      setPhase('done');
      setShowSummary(true);
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Difficulty bar width helper
  // ---------------------------------------------------------------------------

  function difficultyWidth(d: 'high' | 'medium' | 'low'): string {
    if (d === 'high') return 'w-4/5';
    if (d === 'medium') return 'w-1/2';
    return 'w-1/4';
  }

  function difficultyColor(d: 'high' | 'medium' | 'low'): string {
    if (d === 'high') return 'bg-rose-500';
    if (d === 'medium') return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  function priorityColor(p: 'high' | 'medium' | 'low'): string {
    if (p === 'high') return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (p === 'medium') return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
  }

  function volumeBadge(v: 'high' | 'medium' | 'low'): string {
    if (v === 'high') return 'bg-emerald-500/15 text-emerald-400';
    if (v === 'medium') return 'bg-blue-500/15 text-blue-400';
    return 'bg-zinc-500/15 text-zinc-400';
  }

  const phasesCompleted =
    (keywordsDone && keywords.length > 0 ? 1 : 0) +
    (plansDone && plans.length > 0 ? 1 : 0) +
    (draftDone && draftRef.current ? 1 : 0);

  const totalAIPhases = 3;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md">
      {/* Background grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Center panel */}
      <div className="relative w-full max-w-2xl mx-4">
        {/* Animated border */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-blue-500/20 via-blue-400/10 to-blue-500/20 activation-border-glow" />

        <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800/80 p-8 overflow-hidden">
          {/* Top progress bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800">
            <div
              className="h-full bg-blue-500 transition-all duration-700 ease-out"
              style={{ width: `${progressMap[phase]}%` }}
            />
          </div>

          {/* Logo + header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              {phase !== 'done' && (
                <div className="absolute inset-0 rounded-xl bg-blue-400/20 activation-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Conduit Activation</h2>
              <p className="text-xs text-zinc-500 font-mono">{niche} &middot; {domain || 'your site'}</p>
            </div>
          </div>

          {/* Content area */}
          <div className="min-h-[340px] flex flex-col">

            {/* -------- Phase 1: Boot -------- */}
            {phase === 'boot' && (
              <div className="flex flex-col gap-4 activation-fade-in">
                <p className="font-mono text-sm text-blue-400">{bootText}<span className="activation-cursor">|</span></p>

                {/* Nav items lighting up */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NAV_ITEMS.map((item, i) => (
                    <span
                      key={item}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all duration-300 ${
                        i < navLit
                          ? 'text-blue-300 bg-blue-500/10 border border-blue-500/20'
                          : 'text-zinc-700 bg-zinc-900 border border-zinc-800'
                      }`}
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {/* Pulse ring */}
                <div className="flex justify-center mt-4">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full bg-blue-500/10 activation-ring" />
                    <div className="absolute inset-2 rounded-full bg-blue-500/20 activation-ring" style={{ animationDelay: '0.2s' }} />
                    <div className="absolute inset-4 rounded-full bg-blue-500/30" />
                  </div>
                </div>
              </div>
            )}

            {/* -------- Phase 2: Keywords -------- */}
            {phase === 'keywords' && (
              <div className="flex flex-col gap-3 activation-fade-in">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-blue-400">
                    {keywordsDone ? `${keywords.length} keyword opportunities discovered` : `Scanning niche: ${niche}...`}
                  </p>
                  <span className="font-mono text-xs text-zinc-500">
                    Keywords: {keywords.length}{keywordsDone && keywords.length > 0 ? ' \u2713' : ''}
                  </span>
                </div>

                {/* Keyword list */}
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {keywords.map((kw, i) => (
                    <div key={`${kw.keyword}-${i}`} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-zinc-900/80 border border-zinc-800/50 activation-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <span className="text-sm text-zinc-200 flex-1 truncate">{kw.keyword}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${volumeBadge(kw.estimatedVolume)}`}>
                        {kw.estimatedVolume}
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className={`h-full rounded-full ${difficultyColor(kw.estimatedDifficulty)} ${difficultyWidth(kw.estimatedDifficulty)}`} />
                      </div>
                    </div>
                  ))}
                  {!keywordsDone && (
                    <div className="flex items-center gap-2 py-1.5 px-3">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      <span className="text-xs text-zinc-500 font-mono">discovering...</span>
                    </div>
                  )}
                </div>

                {/* Error inline */}
                {errors.find((e) => e.phase === 'keywords') && (
                  <p className="text-xs text-amber-400/80 font-mono">
                    {errors.find((e) => e.phase === 'keywords')?.message}
                  </p>
                )}
              </div>
            )}

            {/* -------- Phase 3: Planning -------- */}
            {phase === 'planning' && (
              <div className="flex flex-col gap-3 activation-fade-in">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-blue-400">
                    {plansDone ? `${plans.length} articles planned` : 'Planning content calendar...'}
                  </p>
                  <span className="font-mono text-xs text-zinc-500">
                    Articles planned: {plans.length}{plansDone && plans.length > 0 ? ' \u2713' : ''}
                  </span>
                </div>

                {/* Plan cards */}
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {plans.map((plan, i) => (
                    <div key={`${plan.title}-${i}`} className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/50 activation-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-zinc-200 font-medium">{plan.title}</p>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${priorityColor(plan.priority)}`}>
                          {plan.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {plan.contentType}
                        </span>
                        <span className="text-[10px] text-zinc-600">{plan.scheduledDate}</span>
                      </div>
                    </div>
                  ))}
                  {!plansDone && (
                    <div className="flex items-center gap-2 py-1.5 px-3">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      <span className="text-xs text-zinc-500 font-mono">planning...</span>
                    </div>
                  )}
                </div>

                {errors.find((e) => e.phase === 'planning') && (
                  <p className="text-xs text-amber-400/80 font-mono">
                    {errors.find((e) => e.phase === 'planning')?.message}
                  </p>
                )}
              </div>
            )}

            {/* -------- Phase 4: Drafting -------- */}
            {phase === 'drafting' && (
              <div className="flex flex-col gap-4 activation-fade-in">
                <p className="font-mono text-sm text-blue-400">
                  {draftDone ? 'Draft ready' : 'Generating your first article...'}
                </p>

                {draftTitle && (
                  <p className="text-sm text-zinc-200 font-medium">&ldquo;{draftTitle}&rdquo;</p>
                )}

                {/* Word count ticker */}
                <div className="flex items-center gap-6">
                  <div>
                    <span className="font-mono text-2xl font-bold text-white">{wordCount.toLocaleString()}</span>
                    <span className="text-xs text-zinc-500 ml-1.5">words</span>
                  </div>
                  {seoScore > 0 && (
                    <div>
                      <span className="font-mono text-2xl font-bold text-emerald-400">{seoScore}</span>
                      <span className="text-xs text-zinc-500 ml-1.5">SEO</span>
                    </div>
                  )}
                  {aiScore > 0 && (
                    <div>
                      <span className="font-mono text-2xl font-bold text-blue-400">{aiScore}</span>
                      <span className="text-xs text-zinc-500 ml-1.5">AI</span>
                    </div>
                  )}
                </div>

                {/* SEO score bar */}
                {seoScore > 0 && (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-zinc-500 font-mono">SEO Score</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{seoScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                        style={{ width: `${seoScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {!draftDone && (
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    <span className="text-xs text-zinc-500 font-mono">writing...</span>
                  </div>
                )}

                {errors.find((e) => e.phase === 'drafting') && (
                  <p className="text-xs text-amber-400/80 font-mono">
                    {errors.find((e) => e.phase === 'drafting')?.message}
                  </p>
                )}
              </div>
            )}

            {/* -------- Phase 5: Agents -------- */}
            {phase === 'agents' && (
              <div className="flex flex-col gap-3 activation-fade-in">
                <p className="font-mono text-sm text-blue-400">Activating autonomous agents...</p>

                <div className="space-y-2 mt-2">
                  {AGENT_NAMES.map((name, i) => (
                    <div key={name} className="flex items-center gap-3 py-1 activation-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <div
                        className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                          i < agentsOnline
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                            : 'bg-zinc-700'
                        }`}
                      />
                      <span className={`text-sm font-mono transition-colors duration-300 ${
                        i < agentsOnline ? 'text-zinc-200' : 'text-zinc-600'
                      }`}>
                        {name}
                      </span>
                      {i < agentsOnline && (
                        <span className="text-[10px] text-emerald-500/60 font-mono">online</span>
                      )}
                    </div>
                  ))}
                </div>

                {agentsOnline === AGENT_NAMES.length && (
                  <p className="text-xs text-emerald-400 font-mono mt-2">All agents online and monitoring.</p>
                )}
              </div>
            )}

            {/* -------- Phase 6: System Online -------- */}
            {phase === 'online' && (
              <div className="flex flex-col items-center justify-center gap-4 py-8 activation-fade-in">
                <div className="relative">
                  <p className="text-3xl font-bold text-white tracking-wider activation-glow-text">CONDUIT ONLINE</p>
                  <div className="absolute inset-0 blur-xl bg-blue-500/20 -z-10" />
                </div>
              </div>
            )}

            {/* -------- Phase 7: Summary -------- */}
            {phase === 'done' && showSummary && (
              <div className="flex flex-col gap-5 activation-fade-in">
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/50">
                    <span className="text-xl font-bold text-blue-400 font-mono">{keywords.length}</span>
                    <span className="text-xs text-zinc-400">keywords discovered</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/50">
                    <span className="text-xl font-bold text-blue-400 font-mono">{plans.length}</span>
                    <span className="text-xs text-zinc-400">articles planned</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/50">
                    <span className="text-xl font-bold text-blue-400 font-mono">{draftRef.current ? 1 : 0}</span>
                    <span className="text-xs text-zinc-400">draft ready for review</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/50">
                    <span className="text-xl font-bold text-emerald-400 font-mono">8</span>
                    <span className="text-xs text-zinc-400">agents monitoring 24/7</span>
                  </div>
                </div>

                {/* Credits */}
                <p className="text-xs text-zinc-500 font-mono text-center">
                  Credits used: {creditsUsed} of 100
                </p>

                {/* Error summary */}
                {errors.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <p className="text-xs text-amber-400 font-mono">
                      {phasesCompleted} of {totalAIPhases} AI phases completed.
                      {errors.some((e) => e.message.toLowerCase().includes('api') || e.message.toLowerCase().includes('key'))
                        ? ' Add an API key to complete remaining phases.'
                        : ' Some phases were skipped.'}
                    </p>
                  </div>
                )}

                {/* Enter button */}
                <button
                  type="button"
                  onClick={onComplete}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 mt-2"
                >
                  Enter Command Center &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        .activation-fade-in {
          animation: activationFadeIn 0.4s ease-out both;
        }
        @keyframes activationFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .activation-slide-up {
          animation: activationSlideUp 0.3s ease-out both;
        }
        @keyframes activationSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .activation-cursor {
          animation: activationBlink 0.7s ease-in-out infinite;
        }
        @keyframes activationBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .activation-pulse {
          animation: activationPulse 2s ease-in-out infinite;
        }
        @keyframes activationPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
        .activation-ring {
          animation: activationRing 1.5s ease-out infinite;
        }
        @keyframes activationRing {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        .activation-glow-text {
          text-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2);
        }
        .activation-border-glow {
          animation: activationBorderGlow 3s ease-in-out infinite;
        }
        @keyframes activationBorderGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
