'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/stores/workspace';
import { SeedUploader } from '@/components/SeedUploader';
import type { SeedData } from '@/lib/autopilot/seed';
import { ActivationSequence } from '@/components/ActivationSequence';

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
  const setOnboardingComplete = useWorkspace((s) => s.setOnboardingComplete);
  const addKeyword = useWorkspace((s) => s.addKeyword);
  const setDomain = useWorkspace((s) => s.setDomain);
  const setNiche = useWorkspace((s) => s.setNiche);
  const setTargetAudience = useWorkspace((s) => s.setTargetAudience);
  const setContentGoal = useWorkspace((s) => s.setContentGoal);
  const setCompetitors = useWorkspace((s) => s.setCompetitors);
  const setAutopilot = useWorkspace((s) => s.setAutopilot);
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
      domain: data.domain,
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
        // Full-screen ActivationSequence overlay — replaces old step 4 + 5
        return null;
      case 5:
        // Kept for step indicator count but unreachable — activation handles completion
        return null;
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

      {/* Live Activation overlay — replaces old step 4 + 5 */}
      {step >= 4 && (
        <ActivationSequence
          niche={data.niche === 'Other' ? data.customNiche : data.niche}
          domain={data.domain}
          competitors={data.competitors}
          language={data.language}
          targetAudience={data.targetAudience}
          contentGoal={data.contentGoal}
          onComplete={finish}
        />
      )}
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
// Steps 5-6 replaced by ActivationSequence overlay (see components/ActivationSequence.tsx)
// ---------------------------------------------------------------------------
