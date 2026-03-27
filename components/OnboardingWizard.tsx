'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { callAI } from '@/lib/ai/call-ai';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NICHES = [
  'Technology',
  'Finance',
  'Health',
  'Travel',
  'Education',
  'Marketing',
  'E-commerce',
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

const AI_PROVIDERS_LIST = [
  { id: 'anthropic', label: 'Anthropic (Claude)' },
  { id: 'openai', label: 'OpenAI (GPT-4)' },
  { id: 'gemini', label: 'Google (Gemini)' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'groq', label: 'Groq' },
] as const;

const TOTAL_STEPS = 5;

const STORAGE_KEY = 'conduit-onboarding-progress';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Types
// ---------------------------------------------------------------------------

interface OnboardingData {
  workspaceName: string;
  niche: string;
  language: string;
  aiChoice: 'platform' | 'byok' | 'skip' | '';
  byokProvider: string;
  byokKey: string;
  articleTitle: string;
  articleKeyword: string;
  generatedContent: string;
}

const DEFAULT_DATA: OnboardingData = {
  workspaceName: '',
  niche: 'Technology',
  language: 'en',
  aiChoice: '',
  byokProvider: 'openai',
  byokKey: '',
  articleTitle: '',
  articleKeyword: '',
  generatedContent: '',
};

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
  const siteName = useWorkspace((s) => s.siteName);
  const settings = useWorkspace((s) => s.settings);
  const setSettings = useWorkspace((s) => s.setSettings);
  const setWorkspaceFn = useWorkspace((s) => s.setWorkspace);
  const workspaceId = useWorkspace((s) => s.workspaceId);
  const addContent = useWorkspace((s) => s.addContent);
  const content = useWorkspace((s) => s.content);
  const deductCredit = useWorkspace((s) => s.deductCredit);
  const setOnboardingComplete = useWorkspace((s) => s.setOnboardingComplete);

  // Restore progress
  const saved = loadProgress();
  const [step, setStep] = useState(saved?.step ?? 0);
  const [data, setData] = useState<OnboardingData>(() => ({
    ...DEFAULT_DATA,
    workspaceName: saved?.data?.workspaceName || siteName || '',
    ...(saved?.data ?? {}),
  }));
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
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
    // Apply workspace name
    if (data.workspaceName && workspaceId) {
      setWorkspaceFn(workspaceId, data.workspaceName);
    }

    // Apply settings
    const settingsUpdate: Partial<typeof settings> = {};
    if (data.niche) settingsUpdate.niche = data.niche;
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

    // Mark complete
    setOnboardingComplete(true);
    clearProgress();
  }

  function skipOnboarding() {
    setOnboardingComplete(true);
    clearProgress();
  }

  async function generateArticle() {
    if (!data.articleTitle.trim()) return;
    setGenerating(true);
    setGenError('');

    try {
      const prompt = `Write a short introductory article (about 150 words) with the title "${data.articleTitle}"${
        data.articleKeyword ? ` targeting the keyword "${data.articleKeyword}"` : ''
      }. Use markdown formatting with a brief intro paragraph and 2-3 subheadings. Be engaging and informative.`;

      const result = await callAI(prompt, {
        maxTokens: 600,
        system: 'You are a professional content writer. Write concise, SEO-friendly articles.',
      }, settings as unknown as Record<string, string>);

      // Deduct credit only after successful AI response
      deductCredit('aiCalls');

      updateData({ generatedContent: result });

      // Save as content item
      const newItem = {
        id: Date.now(),
        title: data.articleTitle,
        content: result,
        body: result,
        keyword: data.articleKeyword || undefined,
        status: 'draft' as const,
        wordCount: result.split(/\s+/).length,
        aiScore: 75,
        seoScore: 60,
        created: Date.now(),
        updated: Date.now(),
      };
      addContent(newItem);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'AI generation failed. You can try again later from the editor.');
    } finally {
      setGenerating(false);
    }
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
          <StepWorkspace
            data={data}
            onChange={updateData}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 2:
        return (
          <StepAIProvider
            data={data}
            onChange={updateData}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 3:
        return (
          <StepFirstContent
            data={data}
            onChange={updateData}
            generating={generating}
            genError={genError}
            onGenerate={generateArticle}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 4:
        return (
          <StepDone
            contentCount={content.length}
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
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Welcome
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
        Let&apos;s set up your content command center in 2 minutes. We&apos;ll configure your
        workspace, connect an AI engine, and optionally create your first article.
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
// Step 2 — Workspace Setup
// ---------------------------------------------------------------------------

function StepWorkspace({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onChange: (p: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Set up your workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tell us about your content operation.</p>
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
          disabled={!data.workspaceName.trim()}
          className="flex-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — AI Provider
// ---------------------------------------------------------------------------

function StepAIProvider({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onChange: (p: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const options: { id: OnboardingData['aiChoice']; title: string; desc: string }[] = [
    { id: 'platform', title: "Use Conduit's AI", desc: 'Platform credits, easiest setup' },
    { id: 'byok', title: 'Bring your own key', desc: 'Paste your API key, unlimited usage' },
    { id: 'skip', title: 'Skip for now', desc: 'You can set this up later in Settings' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Choose your AI engine</h2>
        <p className="mt-1 text-sm text-muted-foreground">Power your content generation pipeline.</p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange({ aiChoice: opt.id })}
            className={`flex flex-col gap-0.5 rounded-lg border px-4 py-3 text-left transition ${
              data.aiChoice === opt.id
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-[var(--color-border,hsl(240_3.7%_15.9%))] hover:border-blue-500/40'
            }`}
          >
            <span className="text-sm font-medium text-foreground">{opt.title}</span>
            <span className="text-xs text-muted-foreground">{opt.desc}</span>
          </button>
        ))}
      </div>

      {/* BYOK details */}
      {data.aiChoice === 'byok' && (
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background p-4">
          <div>
            <label htmlFor="ob-ai-provider" className="mb-1 block text-xs font-medium text-muted-foreground">
              Provider
            </label>
            <select
              id="ob-ai-provider"
              value={data.byokProvider}
              onChange={(e) => onChange({ byokProvider: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {AI_PROVIDERS_LIST.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ob-api-key" className="mb-1 block text-xs font-medium text-muted-foreground">
              API Key
            </label>
            <input
              id="ob-api-key"
              type="password"
              value={data.byokKey}
              onChange={(e) => onChange({ byokKey: e.target.value })}
              placeholder="sk-..."
              className="w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
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
          disabled={!data.aiChoice || (data.aiChoice === 'byok' && !data.byokKey.trim())}
          className="flex-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — First Content
// ---------------------------------------------------------------------------

function StepFirstContent({
  data,
  onChange,
  generating,
  genError,
  onGenerate,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onChange: (p: Partial<OnboardingData>) => void;
  generating: boolean;
  genError: string;
  onGenerate: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Create your first article</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Try AI-powered content generation, or skip and create content later.
        </p>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="ob-title" className="mb-1 block text-xs font-medium text-muted-foreground">
          Article title
        </label>
        <input
          id="ob-title"
          type="text"
          value={data.articleTitle}
          onChange={(e) => onChange({ articleTitle: e.target.value })}
          placeholder="e.g. 10 Tips for Better SEO"
          className="w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Keyword */}
      <div>
        <label htmlFor="ob-keyword" className="mb-1 block text-xs font-medium text-muted-foreground">
          Target keyword (optional)
        </label>
        <input
          id="ob-keyword"
          type="text"
          value={data.articleKeyword}
          onChange={(e) => onChange({ articleKeyword: e.target.value })}
          placeholder="e.g. seo tips"
          className="w-full rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Generate */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating || !data.articleTitle.trim()}
        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
      >
        {generating ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Generating...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            Generate with AI
          </>
        )}
      </button>

      {genError && <p className="text-xs text-red-400">{genError}</p>}

      {/* Preview */}
      {data.generatedContent && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background p-4">
          <p className="mb-2 text-xs font-medium text-blue-400">Preview</p>
          <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {data.generatedContent.slice(0, 500)}
            {data.generatedContent.length > 500 && '...'}
          </div>
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
          disabled={generating}
          onClick={() => { onNext(); }}
          className="flex-1 rounded-lg border border-[var(--color-border,hsl(240_3.7%_15.9%))] bg-background px-6 py-2.5 text-sm font-medium text-foreground transition hover:bg-blue-600 hover:text-white disabled:opacity-40"
        >
          {data.generatedContent ? 'Continue' : "Skip — I'll create content later"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Done
// ---------------------------------------------------------------------------

function StepDone({
  contentCount,
  onFinish,
  onBack,
}: {
  contentCount: number;
  onFinish: () => void;
  onBack: () => void;
}) {
  const quickLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'AI Studio', href: '/ai-studio', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z' },
    { label: 'Agents', href: '/agents', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5' },
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
        <h2 className="text-2xl font-bold text-foreground">Your command center is ready</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {contentCount > 0
            ? `You have ${contentCount} article${contentCount > 1 ? 's' : ''} ready to go.`
            : 'Start creating content with AI-powered tools.'}
        </p>
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
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
