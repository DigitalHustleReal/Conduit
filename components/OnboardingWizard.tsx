'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/stores/workspace';
import { activateWorkspace } from '@/lib/autopilot/activate';
import type { ActivationResult } from '@/lib/autopilot/activate';
import { SeedUploader } from '@/components/SeedUploader';
import type { SeedData } from '@/lib/autopilot/seed';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NICHES = [
  'Personal Finance',
  'Technology',
  'Health & Wellness',
  'E-commerce',
  'SaaS',
  'Education',
  'Travel',
  'Food & Cooking',
  'Real Estate',
  'Marketing',
  'Legal',
  'Crypto',
  'Other',
] as const;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ko', label: 'Korean' },
] as const;

const CONTENT_GOALS = [
  { id: 'traffic', label: 'Traffic Growth', desc: 'Maximize organic visitors', icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941' },
  { id: 'authority', label: 'Brand Authority', desc: 'Build thought leadership', icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0' },
  { id: 'conversion', label: 'Lead Generation', desc: 'Convert visitors to leads', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
] as const;

const TOTAL_STEPS = 6;

const STORAGE_KEY = 'conduit-onboarding-progress';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface OnboardingData {
  workspaceName: string;
  domain: string;
  niche: string;
  customNiche: string;
  targetAudience: string;
  language: string;
  contentGoal: string;
  competitors: string[];
  competitorInput: string;
  // AI provider (kept from original)
  aiChoice: 'platform' | 'byok' | 'skip' | '';
  byokProvider: string;
  byokKey: string;
}

const DEFAULT_DATA: OnboardingData = {
  workspaceName: '',
  domain: '',
  niche: 'Technology',
  customNiche: '',
  targetAudience: '',
  language: 'en',
  contentGoal: 'traffic',
  competitors: [],
  competitorInput: '',
  aiChoice: '',
  byokProvider: 'openai',
  byokKey: '',
};

function loadProgress(): { step: number; data: OnboardingData } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function saveProgress(step: number, data: OnboardingData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  } catch {
    // ignore
  }
}

function clearProgress() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < current
              ? 'w-8 bg-blue-500'
              : i === current
                ? 'w-8 bg-blue-400'
                : 'w-2 bg-[var(--color-border,hsl(240_3.7%_15.9%))]'
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
  const router = useRouter();
  const siteName = useWorkspace((s) => s.siteName);
  const settings = useWorkspace((s) => s.settings);
  const setSettings = useWorkspace((s) => s.setSettings);
  const setWorkspaceFn = useWorkspace((s) => s.setWorkspace);
  const workspaceId = useWorkspace((s) => s.workspaceId);
  const addContent = useWorkspace((s) => s.addContent);
  const deductCredit = useWorkspace((s) => s.deductCredit);
  const setOnboardingComplete = useWorkspace((s) => s.setOnboardingComplete);
  const addKeyword = useWorkspace((s) => s.addKeyword);
  const addPipelineItem = useWorkspace((s) => s.addPipelineItem);
  const setDomain = useWorkspace((s) => s.setDomain);
  const setNiche = useWorkspace((s) => s.setNiche);
  const setTargetAudience = useWorkspace((s) => s.setTargetAudience);
  const setContentGoal = useWorkspace((s) => s.setContentGoal);
  const setCompetitors = useWorkspace((s) => s.setCompetitors);
  const setAutopilot = useWorkspace((s) => s.setAutopilot);
  const addDiscoveredKeywords = useWorkspace((s) => s.addDiscoveredKeywords);
  const addPlannedContent = useWorkspace((s) => s.addPlannedContent);
  const addGeneratedDraft = useWorkspace((s) => s.addGeneratedDraft);
  const setAutopilotEngineConfig = useWorkspace((s) => s.setAutopilotEngineConfig);
  const updateAutopilotEngineState = useWorkspace((s) => s.updateAutopilotEngineState);

  // Restore progress
  const saved = loadProgress();
  const [step, setStep] = useState(saved?.step ?? 0);
  const [data, setData] = useState<OnboardingData>(() => ({
    ...DEFAULT_DATA,
    workspaceName: saved?.data?.workspaceName || siteName || '',
    ...(saved?.data ?? {}),
  }));
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');

  // Activation state (step 4)
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null);
  const [activationPhase, setActivationPhase] = useState(0); // 0-4
  const [activationDone, setActivationDone] = useState(false);
  const [activationError, setActivationError] = useState('');

  // Persist on change
  useEffect(() => {
    saveProgress(step, data);
  }, [step, data]);

  const updateData = useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  function goNext() {
    setSlideDir('left');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    setSlideDir('right');
    setStep((s) => Math.max(s - 1, 0));
  }

  function finish() {
    const resolvedNiche = data.niche === 'Other' ? data.customNiche : data.niche;

    // Apply workspace name
    if (data.workspaceName && workspaceId) {
      setWorkspaceFn(workspaceId, data.workspaceName);
    }

    // Save business profile to store
    setDomain(data.domain);
    setNiche(resolvedNiche);
    setTargetAudience(data.targetAudience);
    setContentGoal(data.contentGoal);
    setCompetitors(data.competitors);

    // Apply settings
    const settingsUpdate: Partial<typeof settings> = {};
    if (resolvedNiche) settingsUpdate.niche = resolvedNiche;
    if (data.domain) settingsUpdate.siteDomain = data.domain;
    if (data.language) {
      settingsUpdate.defaultLang = data.language;
      settingsUpdate.defaultLocale = data.language;
      settingsUpdate.activeLangs = [data.language];
    }
    if (data.aiChoice === 'byok' && data.byokKey) {
      const keyMap: Record<string, string> = {
        openai: 'openaiKey',
        gemini: 'geminiKey',
        mistral: 'mistralKey',
        groq: 'groqKey',
      };
      const keyField = keyMap[data.byokProvider];
      if (keyField) {
        (settingsUpdate as Record<string, string>)[keyField] = data.byokKey;
        settingsUpdate.aiProvider = data.byokProvider;
      }
    }
    if (Object.keys(settingsUpdate).length > 0) {
      setSettings(settingsUpdate);
    }

    // Configure autopilot engine
    setAutopilotEngineConfig({
      niche: resolvedNiche,
      language: data.language,
      targetAudience: data.targetAudience,
      contentGoal: data.contentGoal as 'traffic' | 'authority' | 'conversion',
      dailyBudget: 10,
      autoPublish: false,
      competitors: data.competitors,
    });

    // Activate autopilot
    setAutopilot({ enabled: true });
    updateAutopilotEngineState({ isRunning: true });

    // Mark complete
    setOnboardingComplete(true);
    clearProgress();

    // Navigate
    router.push('/dashboard');
  }

  function skipOnboarding() {
    setOnboardingComplete(true);
    clearProgress();
  }

  // ---------------------------------------------------------------------------
  // Render steps
  // ---------------------------------------------------------------------------

  function renderStep() {
    switch (step) {
      case 0:
        return <StepWelcome onNext={goNext} siteName={siteName} />;
      case 1:
        return (
          <StepBusiness
            data={data}
            onChange={updateData}
            onNext={goNext}
            onBack={goBack}
            onSeedImport={(seeds: SeedData) => {
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
            }}
          />
        );
      case 2:
        return (
          <StepCompetitors
            data={data}
            onChange={updateData}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 3:
        return (
          <StepConnectData
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 4:
        return (
          <StepActivation
            data={data}
            settings={settings as unknown as Record<string, string>}
            activationResult={activationResult}
            activationPhase={activationPhase}
            activationDone={activationDone}
            activationError={activationError}
            setActivationResult={setActivationResult}
            setActivationPhase={setActivationPhase}
            setActivationDone={setActivationDone}
            setActivationError={setActivationError}
            deductCredit={deductCredit}
            addDiscoveredKeywords={addDiscoveredKeywords}
            addPlannedContent={addPlannedContent}
            addGeneratedDraft={addGeneratedDraft}
            addKeyword={addKeyword}
            addContent={addContent}
            addPipelineItem={addPipelineItem}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 5:
        return (
          <StepDone
            activationResult={activationResult}
            onFinish={finish}
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="relative flex w-full max-w-lg flex-col gap-8 px-4">
        {/* Step indicator */}
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* Content card */}
        <div
          key={step}
          className={`rounded-2xl border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-[var(--color-card,hsl(240_10%_3.9%))] p-8 shadow-2xl ${
            slideDir === 'left' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
        >
          {renderStep()}
        </div>

        {/* Skip link */}
        {step < TOTAL_STEPS - 1 && (
          <button
            type="button"
            onClick={skipOnboarding}
            className="self-end text-xs text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
          >
            Skip onboarding
          </button>
        )}
      </div>

      {/* Slide animations */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out both; }
        .animate-slide-in-left  { animation: slideInLeft  0.3s ease-out both; }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          50%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-check-pop { animation: checkPop 0.5s ease-out both; }
        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-slow { animation: progressPulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 -- Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onNext, siteName }: { onNext: () => void; siteName: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome to Conduit</h2>
        {siteName && siteName !== 'Your Site' && (
          <p className="mt-1 text-sm text-muted-foreground">
            Hey, {siteName.replace(/'s Workspace$/, '')}
          </p>
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Tell us about your business and we&apos;ll activate your entire content operation automatically
        &mdash; keywords discovered, articles planned, first draft generated, all agents online.
      </p>

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
      >
        Get Started
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 -- Your Business
// ---------------------------------------------------------------------------

function StepBusiness({
  data,
  onChange,
  onNext,
  onBack,
  onSeedImport,
}: {
  data: OnboardingData;
  onChange: (p: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSeedImport?: (seeds: SeedData) => void;
}) {
  const canContinue = data.domain.trim().length > 0 && data.workspaceName.trim().length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Your Business</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tell us about your content operation so our agents know what to optimize.</p>
      </div>

      {/* Workspace name */}
      <div>
        <label htmlFor="ob-ws-name" className="mb-1 block text-xs font-medium text-muted-foreground">
          Workspace name
        </label>
        <input
          id="ob-ws-name"
          type="text"
          value={data.workspaceName}
          onChange={(e) => onChange({ workspaceName: e.target.value })}
          placeholder="My Content Studio"
          className="w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Domain */}
      <div>
        <label htmlFor="ob-domain" className="mb-1 block text-xs font-medium text-muted-foreground">
          Domain URL <span className="text-red-400">*</span>
        </label>
        <input
          id="ob-domain"
          type="text"
          value={data.domain}
          onChange={(e) => onChange({ domain: e.target.value })}
          placeholder="e.g., investingpro.in"
          className="w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Niche */}
      <div>
        <label htmlFor="ob-niche" className="mb-1 block text-xs font-medium text-muted-foreground">
          Niche / Industry
        </label>
        <select
          id="ob-niche"
          value={data.niche}
          onChange={(e) => onChange({ niche: e.target.value })}
          className="w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {NICHES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {data.niche === 'Other' && (
          <input
            type="text"
            value={data.customNiche}
            onChange={(e) => onChange({ customNiche: e.target.value })}
            placeholder="Enter your niche..."
            className="mt-2 w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Target audience */}
      <div>
        <label htmlFor="ob-audience" className="mb-1 block text-xs font-medium text-muted-foreground">
          Target audience
        </label>
        <input
          id="ob-audience"
          type="text"
          value={data.targetAudience}
          onChange={(e) => onChange({ targetAudience: e.target.value })}
          placeholder="e.g., Indian millennials interested in investing"
          className="w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Language */}
      <div>
        <label htmlFor="ob-lang" className="mb-1 block text-xs font-medium text-muted-foreground">
          Primary language
        </label>
        <select
          id="ob-lang"
          value={data.language}
          onChange={(e) => onChange({ language: e.target.value })}
          className="w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Content goal */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Content goal</p>
        <div className="grid grid-cols-3 gap-2">
          {CONTENT_GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange({ contentGoal: g.id })}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition ${
                data.contentGoal === g.id
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-[var(--color-border,hsl(240_3.7%_15.9%))] hover:border-blue-500/40'
              }`}
            >
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={g.icon} />
              </svg>
              <span className="text-xs font-medium text-foreground">{g.label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{g.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-4 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 -- Competitors
// ---------------------------------------------------------------------------

function StepCompetitors({
  data,
  onChange,
  onNext,
  onBack,
  onSeedImport,
}: {
  data: OnboardingData;
  onChange: (p: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSeedImport?: (seeds: SeedData) => void;
}) {
  function addCompetitor() {
    const val = data.competitorInput.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!val || data.competitors.length >= 5) return;
    if (data.competitors.includes(val)) return;
    onChange({ competitors: [...data.competitors, val], competitorInput: '' });
  }

  function removeCompetitor(idx: number) {
    onChange({ competitors: data.competitors.filter((_, i) => i !== idx) });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCompetitor();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Competitors</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add up to 5 competitor websites so our agents can analyze content gaps and find opportunities.
        </p>
      </div>

      {/* Input */}
      <div>
        <label htmlFor="ob-competitor" className="mb-1 block text-xs font-medium text-muted-foreground">
          Competitor domain
        </label>
        <div className="flex gap-2">
          <input
            id="ob-competitor"
            type="text"
            value={data.competitorInput}
            onChange={(e) => onChange({ competitorInput: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="e.g., moneycontrol.com, groww.in"
            disabled={data.competitors.length >= 5}
            className="flex-1 rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
          />
          <button
            type="button"
            onClick={addCompetitor}
            disabled={!data.competitorInput.trim() || data.competitors.length >= 5}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Press Enter to add. {data.competitors.length}/5 added.
        </p>
      </div>

      {/* Tags */}
      {data.competitors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.competitors.map((c, i) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-1 text-xs text-foreground"
            >
              {c}
              <button
                type="button"
                onClick={() => removeCompetitor(i)}
                className="ml-0.5 text-muted-foreground transition hover:text-red-400"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Seed data upload -- Already have keyword research? */}
      {onSeedImport && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border,hsl(240_3.7%_15.9%))]">
          <h3 className="text-sm font-semibold text-foreground mb-1">Already have keyword research?</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Upload your existing keywords from Ahrefs, SEMrush, or any spreadsheet
          </p>
          <SeedUploader onImport={onSeedImport} compact={true} />
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-4 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          {data.competitors.length > 0 ? 'Continue' : "Skip \u2014 I'll add these later"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 -- Connect Data
// ---------------------------------------------------------------------------

function StepConnectData({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const gscConnected = useWorkspace((s) => !!s.settings.gscRefreshToken);

  function connectGSC() {
    // Open GSC auth in same window -- the callback redirects back
    window.location.href = '/api/gsc/auth';
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Connect Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your data sources for real performance feedback.
        </p>
      </div>

      {/* GSC */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Google Search Console</p>
            <p className="text-xs text-muted-foreground">Real search performance data</p>
          </div>
        </div>
        {gscConnected ? (
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">Connected</span>
        ) : (
          <button
            type="button"
            onClick={connectGSC}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
          >
            Connect GSC
          </button>
        )}
      </div>

      {/* GA -- coming soon */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] p-4 opacity-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Google Analytics</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
        </div>
        <span className="rounded-full bg-[var(--color-border,hsl(240_3.7%_15.9%))] px-3 py-1 text-xs text-muted-foreground">Soon</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Connected data = smarter agents. Your agents learn from real traffic.
      </p>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-4 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          {gscConnected ? 'Continue' : "Skip \u2014 I'll connect later"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 -- Activation
// ---------------------------------------------------------------------------

interface ActivationStepProps {
  data: OnboardingData;
  settings: Record<string, string>;
  activationResult: ActivationResult | null;
  activationPhase: number;
  activationDone: boolean;
  activationError: string;
  setActivationResult: (r: ActivationResult | null) => void;
  setActivationPhase: (p: number) => void;
  setActivationDone: (d: boolean) => void;
  setActivationError: (e: string) => void;
  deductCredit: (type?: 'aiCalls') => boolean;
  addDiscoveredKeywords: (kw: import('@/lib/autopilot/engine').KeywordSuggestion[]) => void;
  addPlannedContent: (plans: import('@/lib/autopilot/engine').ContentPlan[]) => void;
  addGeneratedDraft: (draft: import('@/lib/autopilot/engine').DraftContent) => void;
  addKeyword: (item: import('@/types/content').Keyword) => void;
  addContent: (item: import('@/types/content').ContentItem) => void;
  addPipelineItem: (item: import('@/types/content').PipelineItem) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepActivation({
  data,
  settings,
  activationResult,
  activationPhase,
  activationDone,
  activationError,
  setActivationResult,
  setActivationPhase,
  setActivationDone,
  setActivationError,
  deductCredit,
  addDiscoveredKeywords,
  addPlannedContent,
  addGeneratedDraft,
  addKeyword,
  addContent,
  addPipelineItem,
  onNext,
  onBack,
}: ActivationStepProps) {
  const hasStarted = useRef(false);

  const resolvedNiche = data.niche === 'Other' ? data.customNiche : data.niche;

  const phases = [
    { label: 'Workspace created', doneLabel: 'Workspace created' },
    { label: `Discovering keywords for ${resolvedNiche}...`, doneLabel: '' },
    { label: 'Planning content calendar...', doneLabel: '' },
    { label: 'Generating first draft...', doneLabel: '' },
    { label: 'Activating 8 autonomous agents...', doneLabel: 'All agents online' },
  ];

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function run() {
      // Phase 0: workspace created (instant)
      setActivationPhase(1);

      // Phase 1-3: AI activation
      try {
        // Start activation with progress callbacks via phased approach
        setActivationPhase(1);

        const result = await activateWorkspace(
          {
            niche: resolvedNiche,
            domain: data.domain,
            competitors: data.competitors,
            language: data.language,
            targetAudience: data.targetAudience,
            contentGoal: data.contentGoal as 'traffic' | 'authority' | 'conversion',
          },
          settings as Record<string, string>,
        );

        // Update phases based on what succeeded
        if (result.keywords.length > 0) {
          setActivationPhase(2);
          // Add keywords to store
          addDiscoveredKeywords(result.keywords);
          for (const kw of result.keywords) {
            addKeyword({
              id: Date.now() + Math.random(),
              keyword: kw.keyword,
              volume: kw.estimatedVolume === 'high' ? 5000 : kw.estimatedVolume === 'medium' ? 1000 : 200,
              difficulty: kw.estimatedDifficulty === 'high' ? 80 : kw.estimatedDifficulty === 'medium' ? 50 : 20,
              status: 'opportunity',
            });
          }
          // Deduct credit for keyword discovery
          deductCredit('aiCalls');
        }

        if (result.plans.length > 0) {
          setActivationPhase(3);
          addPlannedContent(result.plans);
          // Add to pipeline
          for (const plan of result.plans) {
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
        }

        if (result.draft) {
          setActivationPhase(4);
          addGeneratedDraft(result.draft);
          // Also add as content item
          addContent({
            id: Date.now(),
            title: result.draft.title,
            slug: result.draft.slug,
            content: result.draft.body,
            body: result.draft.body,
            keyword: result.draft.keyword,
            metaTitle: result.draft.metaTitle,
            metaDescription: result.draft.metaDescription,
            status: 'draft',
            wordCount: result.draft.wordCount,
            aiScore: result.draft.aiScore,
            seoScore: result.draft.seoScore,
            created: Date.now(),
            updated: Date.now(),
          });
          deductCredit('aiCalls');
        }

        setActivationResult(result);

        // Phase 4: agents activated
        setActivationPhase(5);
      } catch (err) {
        setActivationError(
          err instanceof Error ? err.message : 'Activation failed',
        );
        // Still mark phase 4 done -- agents activate regardless
        setActivationPhase(5);
        setActivationResult({
          keywords: [],
          plans: [],
          draft: null,
          creditsUsed: 0,
          errors: [err instanceof Error ? err.message : 'Activation failed'],
        });
      }

      setActivationDone(true);
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build display labels
  function getPhaseLabel(idx: number): string {
    if (idx === 0) return phases[0].doneLabel;
    if (idx === 1) {
      if (activationPhase > 1 && activationResult) {
        return `Found ${activationResult.keywords.length} keyword opportunities`;
      }
      return phases[1].label;
    }
    if (idx === 2) {
      if (activationPhase > 2 && activationResult) {
        return `${activationResult.plans.length} articles planned for this week`;
      }
      return phases[2].label;
    }
    if (idx === 3) {
      if (activationPhase > 3 && activationResult?.draft) {
        return `Draft ready: ${activationResult.draft.title.slice(0, 40)}${activationResult.draft.title.length > 40 ? '...' : ''}`;
      }
      return phases[3].label;
    }
    if (idx === 4) {
      if (activationPhase > 4) return phases[4].doneLabel;
      return phases[4].label;
    }
    return '';
  }

  function getPhaseIcon(idx: number) {
    if (idx < activationPhase) {
      // completed
      return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      );
    }
    if (idx === activationPhase) {
      // in progress
      return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        </div>
      );
    }
    // pending
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-border,hsl(240_3.7%_15.9%))]">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      </div>
    );
  }

  const progressPercent = Math.min(100, (activationPhase / 5) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Activating Your Platform</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Setting up your content operation. This takes about 30 seconds.
        </p>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-3">
        {phases.map((_, idx) => (
          <div key={idx} className="flex items-center gap-3">
            {getPhaseIcon(idx)}
            <span className={`text-sm ${idx < activationPhase ? 'text-foreground' : idx === activationPhase ? 'text-blue-400 animate-pulse-slow' : 'text-muted-foreground/50'}`}>
              {getPhaseLabel(idx)}
            </span>
          </div>
        ))}
      </div>

      {/* Error notice (non-blocking) */}
      {activationError && activationDone && (
        <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-400">
          Agents activated. Content will generate when AI is connected.
        </p>
      )}

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border,hsl(240_3.7%_15.9%))]">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Cost note */}
      <p className="text-center text-xs text-muted-foreground">
        Uses 3 of your 100 free credits
      </p>

      {/* Continue button (only when done) */}
      {activationDone && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-4 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6 -- Done
// ---------------------------------------------------------------------------

function StepDone({
  activationResult,
  onFinish,
  onBack,
}: {
  activationResult: ActivationResult | null;
  onFinish: () => void;
  onBack: () => void;
}) {
  const keywordCount = activationResult?.keywords.length ?? 0;
  const planCount = activationResult?.plans.length ?? 0;
  const hasDraft = !!activationResult?.draft;

  const quickLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Review Draft', href: '/editor', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10' },
    { label: 'Keywords', href: '/seo', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' },
    { label: 'Settings', href: '/settings', icon: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z' },
  ];

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Checkmark */}
      <div className="animate-check-pop flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-400">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground">Your content operation is live.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Here&apos;s what was set up:
        </p>
      </div>

      {/* Stats */}
      <div className="grid w-full grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-3 py-2.5 text-left">
          <span className="text-lg font-bold text-blue-400">{keywordCount}</span>
          <span className="text-xs text-muted-foreground">keywords discovered</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-3 py-2.5 text-left">
          <span className="text-lg font-bold text-blue-400">{planCount}</span>
          <span className="text-xs text-muted-foreground">articles planned</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-3 py-2.5 text-left">
          <span className="text-lg font-bold text-blue-400">{hasDraft ? 1 : 0}</span>
          <span className="text-xs text-muted-foreground">draft ready for review</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-3 py-2.5 text-left">
          <span className="text-lg font-bold text-green-400">8</span>
          <span className="text-xs text-muted-foreground">agents monitoring</span>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid w-full grid-cols-2 gap-3">
        {quickLinks.map((link) => (
          <div
            key={link.label}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-3 py-2.5 text-sm text-muted-foreground"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
            </svg>
            {link.label}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex w-full gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] px-4 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Go to Command Center
        </button>
      </div>
    </div>
  );
}
