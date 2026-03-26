'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContentItem, Collection, Keyword, PipelineItem, MediaItem } from '@/types/content';
import type { Credits, TeamMember, WorkspaceSettings, QualityGate, Automation, AutopilotConfig } from '@/types/workspace';
import type { AgentState, AgentFeedbackEntry } from '@/types/agent';

interface WorkspaceStore {
  // Core
  workspaceId: string | null;
  siteName: string;
  pricingPlan: 'free' | 'pro' | 'business';
  credits: Credits;

  // Content
  content: ContentItem[];
  collections: Collection[];
  keywords: Keyword[];
  pipeline: PipelineItem[];
  media: MediaItem[];

  // Config
  settings: WorkspaceSettings;
  team: TeamMember[];
  qualityGates: QualityGate[];
  automations: Automation[];

  // Agent system
  agents: AgentState;
  agentFeedback: AgentFeedbackEntry[];
  agentMemory: Record<string, Record<string, { value: unknown; ts: number }>>;
  autopilot: AutopilotConfig;

  // Content history
  contentHistory: Record<number, Array<{ ts: number; wordCount: number; title: string; snapshot: string }>>;

  // Analytics
  analyticsEvents: Array<{ id: number; type: string; contentId?: string; ts: number; meta?: Record<string, unknown> }>;

  // Actions
  setWorkspace: (id: string, name: string) => void;
  setPlan: (plan: 'free' | 'pro' | 'business') => void;
  setContent: (content: ContentItem[]) => void;
  addContent: (item: ContentItem) => void;
  updateContentItem: (id: number, updates: Partial<ContentItem>) => void;
  deleteContent: (id: number) => void;
  setKeywords: (keywords: Keyword[]) => void;
  setMedia: (media: MediaItem[]) => void;
  setPipeline: (pipeline: PipelineItem[]) => void;
  setSettings: (settings: Partial<WorkspaceSettings>) => void;
  setCredits: (credits: Partial<Credits>) => void;
  deductCredit: (type?: keyof Credits) => boolean;
  setAutopilot: (config: Partial<AutopilotConfig>) => void;
  addAgentFeedback: (entry: AgentFeedbackEntry) => void;
  logAgentRun: (agentId: string, action: string, result: unknown, credits: number) => void;
}

const DEFAULT_CREDITS: Credits = {
  aiCalls: 0, aiLimit: 100, storage: 0, storageLimit: 500,
  apiReqs: 0, apiLimit: 1000, seats: 1, seatLimit: 1,
  socialPosts: 0, socialLimit: 10,
  resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime(),
};

const DEFAULT_SETTINGS: WorkspaceSettings = {
  aiModel: 'claude-sonnet-4-20250514', aiProvider: 'anthropic',
  defaultLocale: 'en', mediaView: 'grid',
  contentTypes: ['Articles', 'Products', 'Pages', 'Glossary', 'FAQs'],
  activeLangs: ['en'], defaultLang: 'en', currency: 'USD',
  integrations: {},
};

const DEFAULT_AUTOPILOT: AutopilotConfig = {
  enabled: false,
  creditBudget: { daily: 10, weekly: 50, used_today: 0, used_week: 0, last_reset: null, week_reset: null },
  schedule: { conductor_interval: 21600000, content_days: [1, 3, 5], seo_days: [2, 4], distribution_days: [1, 2, 3, 4, 5], maintenance_days: [6] },
  rules: { min_seo_score: 60, min_ai_score: 70, max_articles_per_day: 3, auto_publish: false, auto_distribute: true, auto_refresh_days: 90, auto_fix_seo: true, auto_interlink: true },
  log: [],
  stats: { total_runs: 0, total_credits: 0, articles_created: 0, issues_fixed: 0, distributions: 0 },
};

export const PLAN_LIMITS = {
  free: { aiCalls: 100, storage: 500, apiReqs: 1000, seats: 1, socialPosts: 10 },
  pro: { aiCalls: 1000, storage: 10240, apiReqs: 10000, seats: 5, socialPosts: 100 },
  business: { aiCalls: 10000, storage: 102400, apiReqs: 100000, seats: 15, socialPosts: 1000 },
};

export const useWorkspace = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaceId: null,
      siteName: 'Your Site',
      pricingPlan: 'free',
      credits: DEFAULT_CREDITS,
      content: [],
      collections: [],
      keywords: [],
      pipeline: [],
      media: [],
      settings: DEFAULT_SETTINGS,
      team: [{ id: 1, name: 'You (Admin)', email: '', role: 'Admin', status: 'active' }],
      qualityGates: [],
      automations: [],
      agents: {
        registry: {
          contentAutopilot: { enabled: false, running: false, lastRun: null, interval: null },
          seoGuardian: { enabled: false, running: false, lastRun: null, interval: 300000 },
          keywordOpportunity: { enabled: false, running: false, lastRun: null, interval: null },
          publishingPipeline: { enabled: false, running: false, lastRun: null, interval: 120000 },
          smartOnboarding: { enabled: false, running: false, lastRun: null, interval: null },
          healthMonitor: { enabled: false, running: false, lastRun: null, interval: 600000 },
          contentRefresh: { enabled: false, running: false, lastRun: null, interval: null },
          interlinkBuilder: { enabled: false, running: false, lastRun: null, interval: null },
        },
        history: [], queue: [], reports: {}, onboarded: false,
      },
      agentFeedback: [],
      agentMemory: {},
      autopilot: DEFAULT_AUTOPILOT,
      contentHistory: {},
      analyticsEvents: [],

      // Actions
      setWorkspace: (id, name) => set({ workspaceId: id, siteName: name }),
      setPlan: (plan) => set({ pricingPlan: plan }),
      setContent: (content) => set({ content }),
      addContent: (item) => set((s) => ({ content: [...s.content, item] })),
      updateContentItem: (id, updates) => set((s) => ({
        content: s.content.map((c) => c.id === id ? { ...c, ...updates, updated: Date.now() } : c),
      })),
      deleteContent: (id) => set((s) => ({ content: s.content.filter((c) => c.id !== id) })),
      setKeywords: (keywords) => set({ keywords }),
      setMedia: (media) => set({ media }),
      setPipeline: (pipeline) => set({ pipeline }),
      setSettings: (updates) => set((s) => ({ settings: { ...s.settings, ...updates } })),
      setCredits: (updates) => set((s) => ({ credits: { ...s.credits, ...updates } })),

      deductCredit: (type = 'aiCalls') => {
        const state = get();
        const limits = PLAN_LIMITS[state.pricingPlan] || PLAN_LIMITS.free;
        const isBYOK = !!(state.settings.openaiKey || state.settings.geminiKey || state.settings.mistralKey || state.settings.groqKey);
        if (isBYOK) return true;

        const current = (state.credits[type] as number) || 0;
        const limit = (limits as Record<string, number>)[type] || 100;
        if (current >= limit) return false;

        set((s) => ({
          credits: { ...s.credits, [type]: current + 1 },
        }));
        return true;
      },

      setAutopilot: (config) => set((s) => ({ autopilot: { ...s.autopilot, ...config } })),

      addAgentFeedback: (entry) => set((s) => ({
        agentFeedback: [entry, ...s.agentFeedback].slice(0, 200),
      })),

      logAgentRun: (agentId, action, result, credits) => set((s) => ({
        agents: {
          ...s.agents,
          history: [
            { agentId, action, ts: Date.now(), result, creditsUsed: credits },
            ...s.agents.history,
          ].slice(0, 500),
        },
      })),
    }),
    {
      name: 'conduit-workspace',
      partialize: (state) => ({
        workspaceId: state.workspaceId,
        siteName: state.siteName,
        pricingPlan: state.pricingPlan,
        credits: state.credits,
        content: state.content,
        collections: state.collections,
        keywords: state.keywords,
        pipeline: state.pipeline,
        media: state.media,
        settings: state.settings,
        team: state.team,
        qualityGates: state.qualityGates,
        automations: state.automations,
        agents: state.agents,
        agentFeedback: state.agentFeedback,
        agentMemory: state.agentMemory,
        autopilot: state.autopilot,
        contentHistory: state.contentHistory,
      }),
    }
  )
);
