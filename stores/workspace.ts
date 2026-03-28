'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContentItem, Collection, Keyword, PipelineItem, MediaItem } from '@/types/content';
import type { Credits, TeamMember, WorkspaceSettings, QualityGate, Automation, AutopilotConfig } from '@/types/workspace';
import type { AgentState, AgentFeedbackEntry } from '@/types/agent';
import type {
  AutopilotEngineConfig,
  AutopilotEngineState,
  KeywordSuggestion,
  ContentPlan,
  DraftContent,
} from '@/lib/autopilot/engine';
import { createDefaultEngineState } from '@/lib/autopilot/engine';
import type { AgentMemory } from '@/lib/agents/runtime';
import type { BrandVoiceProfile } from '@/lib/agents/voice';
import type { ContentBrief } from '@/lib/agents/brief';
import type { AgentMessage } from '@/lib/agents/handoff';
import type { Deadline } from '@/lib/agents/deadlines';
import { getDefaultLimits, type PublishLimits, type PublishLogEntry } from '@/lib/agents/autopublish';
import type { Notification } from '@/components/NotificationBell';
import type { RepurposedContent, RepurposeConfig } from '@/lib/agents/repurposer';
import { getDefaultRepurposeConfig } from '@/lib/agents/repurposer';
import type { PostingCalendar, ScheduledPost } from '@/lib/agents/social-scheduler';
import { getDefaultCalendar } from '@/lib/agents/social-scheduler';
import type { CostEntry } from '@/lib/seo/budget-governor';
import { getCostSummary as computeCostSummary } from '@/lib/seo/budget-governor';
import {
  loadWorkspaceData,
  syncContent,
  syncKeywords,
  syncCollections,
  syncMedia,
  syncPipeline,
  deleteItem,
  logAudit,
} from '@/lib/supabase/sync';
import type { PipelineEvent } from '@/lib/pipeline/stream';
import type { QueueItem, QueueItemType } from '@/lib/autopilot/queue';
import {
  createQueueItem,
  markApproved,
  markRejected,
  markRevised,
  bulkApproveItems,
  bulkRejectItems,
  dispatchApproval,
} from '@/lib/autopilot/queue';

interface WorkspaceStore {
  // Core
  workspaceId: string | null;
  userId: string | null;
  isAuthenticated: boolean;
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
  agentRuntimeMemories: Record<string, AgentMemory>;
  autopilot: AutopilotConfig;

  // Autopilot engine
  autopilotEngineConfig: AutopilotEngineConfig | null;
  autopilotEngineState: AutopilotEngineState;

  // Content history
  contentHistory: Record<number, Array<{ ts: number; wordCount: number; title: string; snapshot: string }>>;

  // Review Queue
  reviewQueue: QueueItem[];

  // Analytics
  analyticsEvents: Array<{ id: number; type: string; contentId?: string; ts: number; meta?: Record<string, unknown> }>;

  // Publishing
  publishLimits: PublishLimits;
  publishLog: PublishLogEntry[];

  // Repurpose & Social Calendar
  repurposeConfig: RepurposeConfig;
  repurposedContent: RepurposedContent[];
  socialCalendar: PostingCalendar;

  // Onboarding
  onboardingComplete: boolean;

  // Content brief & editorial pipeline
  brandVoiceProfile: BrandVoiceProfile | null;
  contentBriefs: Record<string, ContentBrief>;
  agentMessages: AgentMessage[];
  deadlines: Deadline[];

  // Notifications
  notifications: Notification[];

  // Pipeline builder
  pipelinePreset: string;
  pipelineNodeConfig: Record<string, { enabled: boolean; order: number }>;

  // Pipeline stream events (last 50, persisted)
  pipelineEvents: PipelineEvent[];

  // Budget governor (real USD cost tracking)
  costEntries: CostEntry[];

  // Business profile (set during onboarding)
  domain: string;
  niche: string;
  targetAudience: string;
  contentGoal: string;
  competitors: string[];

  // Actions
  // Pipeline builder actions
  setPipelinePreset: (preset: string) => void;
  togglePipelineNode: (nodeId: string) => void;
  reorderPipelineNode: (nodeId: string, newOrder: number) => void;

  setOnboardingComplete: (value: boolean) => void;
  setDomain: (value: string) => void;
  setNiche: (value: string) => void;
  setTargetAudience: (value: string) => void;
  setContentGoal: (value: string) => void;
  setCompetitors: (value: string[]) => void;
  setAuth: (userId: string | null, isAuthenticated: boolean) => void;
  setWorkspace: (id: string, name: string) => void;
  setPlan: (plan: 'free' | 'pro' | 'business') => void;
  setContent: (content: ContentItem[]) => void;
  addContent: (item: ContentItem) => void;
  updateContentItem: (id: number, updates: Partial<ContentItem>) => void;
  deleteContent: (id: number) => void;
  setKeywords: (keywords: Keyword[]) => void;
  addKeyword: (item: Keyword) => void;
  removeKeyword: (id: number) => void;
  setCollections: (collections: Collection[]) => void;
  addCollection: (item: Collection) => void;
  removeCollection: (id: number) => void;
  setMedia: (media: MediaItem[]) => void;
  addMedia: (item: MediaItem) => void;
  removeMedia: (id: number) => void;
  setPipeline: (pipeline: PipelineItem[]) => void;
  addPipelineItem: (item: PipelineItem) => void;
  removePipelineItem: (id: number) => void;
  setSettings: (settings: Partial<WorkspaceSettings>) => void;
  setCredits: (credits: Partial<Credits>) => void;
  deductCredit: (type?: keyof Credits) => boolean;
  setAutopilot: (config: Partial<AutopilotConfig>) => void;
  setAutopilotEngineConfig: (config: AutopilotEngineConfig | null) => void;
  updateAutopilotEngineState: (state: Partial<AutopilotEngineState>) => void;
  addDiscoveredKeywords: (keywords: KeywordSuggestion[]) => void;
  addPlannedContent: (plans: ContentPlan[]) => void;
  addGeneratedDraft: (draft: DraftContent) => void;
  addAgentFeedback: (entry: AgentFeedbackEntry) => void;
  logAgentRun: (agentId: string, action: string, result: unknown, credits: number) => void;
  updateAgentRuntimeMemory: (agentId: string, memory: AgentMemory) => void;
  getAgentRuntimeMemory: (agentId: string) => AgentMemory | undefined;

  // Brief & editorial pipeline actions
  setBrandVoiceProfile: (profile: BrandVoiceProfile | null) => void;
  addContentBrief: (keyword: string, brief: ContentBrief) => void;
  postAgentMessage: (msg: Omit<AgentMessage, 'timestamp'>) => void;
  getAgentMessages: (agentId: string) => AgentMessage[];
  addDeadline: (deadline: Deadline) => void;
  updateDeadline: (contentId: string, stage: string, updates: Partial<Deadline>) => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearOldNotifications: () => void;

  // Pipeline event actions
  addPipelineEvent: (event: PipelineEvent) => void;
  clearPipelineEvents: () => void;

  // Publish actions
  setPublishLimits: (limits: Partial<PublishLimits>) => void;
  addPublishLog: (entry: PublishLogEntry) => void;

  // Repurpose actions
  setRepurposeConfig: (config: Partial<RepurposeConfig>) => void;
  addRepurposedContent: (items: RepurposedContent[]) => void;
  clearRepurposedContent: () => void;
  addScheduledPost: (post: ScheduledPost) => void;
  addScheduledPosts: (posts: ScheduledPost[]) => void;
  updatePostStatus: (postId: string, status: ScheduledPost['status']) => void;
  setSocialCalendarRules: (rules: Partial<PostingCalendar['rules']>) => void;

  // Budget governor actions
  addCostEntry: (entry: CostEntry) => void;
  getCostSummary: () => { today: number; week: number; month: number; total: number; byType: Record<string, number> };

  // Review queue actions
  addToQueue: (item: Omit<QueueItem, 'id' | 'status' | 'createdAt'>) => QueueItem;
  approveItem: (id: string) => void;
  rejectItem: (id: string, reason?: string) => void;
  reviseItem: (id: string, revisedData: Record<string, unknown>) => void;
  bulkApproveQueue: (type?: QueueItemType) => number;
  bulkRejectQueue: (type?: QueueItemType, reason?: string) => number;
  clearQueue: (status?: QueueItem['status']) => void;

  // Supabase sync
  loadFromSupabase: (workspaceId: string) => Promise<void>;
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

// ---------------------------------------------------------------------------
// Async sync helper — fire-and-forget, never blocks Zustand
// ---------------------------------------------------------------------------

function bgSync(fn: () => Promise<void>): void {
  fn().catch((err) => console.warn('[store] background sync error:', err));
}

export const useWorkspace = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaceId: null,
      userId: null,
      isAuthenticated: false,
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
      agentRuntimeMemories: {},
      autopilot: DEFAULT_AUTOPILOT,
      autopilotEngineConfig: null,
      autopilotEngineState: createDefaultEngineState(),
      publishLimits: getDefaultLimits(),
      publishLog: [],
      repurposeConfig: getDefaultRepurposeConfig(),
      repurposedContent: [],
      socialCalendar: getDefaultCalendar(),
      reviewQueue: [],
      contentHistory: {},
      analyticsEvents: [],
      onboardingComplete: false,

      // Notifications
      notifications: [],

      // Content brief & editorial pipeline
      brandVoiceProfile: null,
      contentBriefs: {},
      agentMessages: [],
      deadlines: [],

      // Pipeline builder
      pipelinePreset: 'full-autopilot',
      pipelineNodeConfig: {},

      // Pipeline stream events
      pipelineEvents: [],

      // Budget governor
      costEntries: [],

      // Business profile
      domain: '',
      niche: '',
      targetAudience: '',
      contentGoal: 'traffic',
      competitors: [],

      // -----------------------------------------------------------------------
      // Actions
      // -----------------------------------------------------------------------

      // Pipeline builder actions
      setPipelinePreset: (preset) => set({ pipelinePreset: preset }),

      togglePipelineNode: (nodeId) => set((s) => {
        const current = s.pipelineNodeConfig[nodeId] ?? { enabled: true, order: 0 };
        return {
          pipelineNodeConfig: {
            ...s.pipelineNodeConfig,
            [nodeId]: { ...current, enabled: !current.enabled },
          },
        };
      }),

      reorderPipelineNode: (nodeId, newOrder) => set((s) => {
        const current = s.pipelineNodeConfig[nodeId] ?? { enabled: true, order: 0 };
        return {
          pipelineNodeConfig: {
            ...s.pipelineNodeConfig,
            [nodeId]: { ...current, order: newOrder },
          },
        };
      }),

      setOnboardingComplete: (value) => set({ onboardingComplete: value }),
      setDomain: (value) => set({ domain: value }),
      setNiche: (value) => set({ niche: value }),
      setTargetAudience: (value) => set({ targetAudience: value }),
      setContentGoal: (value) => set({ contentGoal: value }),
      setCompetitors: (value) => set({ competitors: value }),

      setAuth: (userId, isAuthenticated) => set({ userId, isAuthenticated }),

      setWorkspace: (id, name) => set({ workspaceId: id, siteName: name }),

      setPlan: (plan) => set({ pricingPlan: plan }),

      setContent: (content) => {
        set({ content });
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => syncContent(wsId, content));
      },

      addContent: (item) => {
        set((s) => ({ content: [...s.content, item] }));
        const wsId = get().workspaceId;
        if (wsId) {
          bgSync(() => syncContent(wsId, [item]));
          bgSync(() => logAudit(wsId, get().userId ?? '', 'content.create', { title: item.title }));
        }
      },

      updateContentItem: (id, updates) => {
        set((s) => ({
          content: s.content.map((c) => c.id === id ? { ...c, ...updates, updated: Date.now() } : c),
        }));
        const state = get();
        const wsId = state.workspaceId;
        if (wsId) {
          const updated = state.content.find((c) => c.id === id);
          if (updated) bgSync(() => syncContent(wsId, [updated]));
        }
      },

      deleteContent: (id) => {
        set((s) => ({ content: s.content.filter((c) => c.id !== id) }));
        const wsId = get().workspaceId;
        if (wsId) {
          bgSync(() => deleteItem('content', id));
          bgSync(() => logAudit(wsId, get().userId ?? '', 'content.delete', { contentId: id }));
        }
      },

      setKeywords: (keywords) => {
        set({ keywords });
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => syncKeywords(wsId, keywords));
      },

      addKeyword: (item) => {
        set((s) => ({ keywords: [...s.keywords, item] }));
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => syncKeywords(wsId, [item]));
      },

      removeKeyword: (id) => {
        set((s) => ({ keywords: s.keywords.filter((k) => k.id !== id) }));
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => deleteItem('keywords', id));
      },

      setCollections: (collections) => {
        set({ collections });
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => syncCollections(wsId, collections));
      },

      addCollection: (item) => {
        set((s) => ({ collections: [...s.collections, item] }));
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => syncCollections(wsId, [item]));
      },

      removeCollection: (id) => {
        set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => deleteItem('collections', id));
      },

      setMedia: (media) => {
        set({ media });
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => syncMedia(wsId, media));
      },

      addMedia: (item) => {
        set((s) => ({ media: [...s.media, item] }));
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => syncMedia(wsId, [item]));
      },

      removeMedia: (id) => {
        set((s) => ({ media: s.media.filter((m) => m.id !== id) }));
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => deleteItem('media', id));
      },

      setPipeline: (pipeline) => {
        set({ pipeline });
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => syncPipeline(wsId, pipeline));
      },

      addPipelineItem: (item) => {
        set((s) => ({ pipeline: [...s.pipeline, item] }));
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => syncPipeline(wsId, [item]));
      },

      removePipelineItem: (id) => {
        set((s) => ({ pipeline: s.pipeline.filter((p) => p.id !== id) }));
        const wsId = get().workspaceId;
        if (wsId) bgSync(() => deleteItem('pipeline', id));
      },

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

      // -----------------------------------------------------------------------
      // Notification actions
      // -----------------------------------------------------------------------

      addNotification: (notification) => set((s) => ({
        notifications: [
          {
            ...notification,
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            read: false,
            createdAt: Date.now(),
          },
          ...s.notifications,
        ].slice(0, 100),
      })),

      markNotificationRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      })),

      markAllNotificationsRead: () => set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      })),

      clearOldNotifications: () => set((s) => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return {
          notifications: s.notifications.filter(
            (n) => !n.read || n.createdAt > sevenDaysAgo,
          ),
        };
      }),

      addPipelineEvent: (event) => set((s) => ({
        pipelineEvents: [...s.pipelineEvents, event].slice(-50),
      })),

      clearPipelineEvents: () => set({ pipelineEvents: [] }),

      // Budget governor actions
      addCostEntry: (entry) => set((s) => ({
        costEntries: [...s.costEntries, entry].slice(-2000), // keep last 2000 entries
      })),

      getCostSummary: () => {
        return computeCostSummary(get().costEntries);
      },

      setPublishLimits: (limits) => set((s) => ({
        publishLimits: { ...s.publishLimits, ...limits },
      })),

      addPublishLog: (entry) => set((s) => ({
        publishLog: [entry, ...s.publishLog].slice(0, 500),
      })),

      // Repurpose actions
      setRepurposeConfig: (config) => set((s) => ({
        repurposeConfig: { ...s.repurposeConfig, ...config },
      })),

      addRepurposedContent: (items) => set((s) => ({
        repurposedContent: [...items, ...s.repurposedContent].slice(0, 500),
      })),

      clearRepurposedContent: () => set({ repurposedContent: [] }),

      addScheduledPost: (post) => set((s) => ({
        socialCalendar: {
          ...s.socialCalendar,
          posts: [post, ...s.socialCalendar.posts].slice(0, 1000),
        },
      })),

      addScheduledPosts: (posts) => set((s) => ({
        socialCalendar: {
          ...s.socialCalendar,
          posts: [...posts, ...s.socialCalendar.posts].slice(0, 1000),
        },
      })),

      updatePostStatus: (postId, status) => set((s) => ({
        socialCalendar: {
          ...s.socialCalendar,
          posts: s.socialCalendar.posts.map((p) =>
            p.id === postId ? { ...p, status } : p,
          ),
        },
      })),

      setSocialCalendarRules: (rules) => set((s) => ({
        socialCalendar: {
          ...s.socialCalendar,
          rules: { ...s.socialCalendar.rules, ...rules },
        },
      })),

      setAutopilot: (config) => set((s) => ({ autopilot: { ...s.autopilot, ...config } })),

      setAutopilotEngineConfig: (config) => set({ autopilotEngineConfig: config }),

      updateAutopilotEngineState: (updates) =>
        set((s) => ({ autopilotEngineState: { ...s.autopilotEngineState, ...updates } })),

      addDiscoveredKeywords: (keywords) =>
        set((s) => ({
          autopilotEngineState: {
            ...s.autopilotEngineState,
            discoveredKeywords: [
              ...s.autopilotEngineState.discoveredKeywords,
              ...keywords,
            ].slice(0, 500), // cap to prevent unbounded growth
          },
        })),

      addPlannedContent: (plans) =>
        set((s) => ({
          autopilotEngineState: {
            ...s.autopilotEngineState,
            plannedContent: [
              ...s.autopilotEngineState.plannedContent,
              ...plans,
            ].slice(0, 200),
          },
        })),

      addGeneratedDraft: (draft) =>
        set((s) => ({
          autopilotEngineState: {
            ...s.autopilotEngineState,
            generatedDrafts: [
              ...s.autopilotEngineState.generatedDrafts,
              draft,
            ].slice(0, 100),
          },
        })),

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

      updateAgentRuntimeMemory: (agentId, memory) => set((s) => ({
        agentRuntimeMemories: { ...s.agentRuntimeMemories, [agentId]: memory },
      })),

      getAgentRuntimeMemory: (agentId) => get().agentRuntimeMemories[agentId],

      // -----------------------------------------------------------------------
      // Brief & editorial pipeline actions
      // -----------------------------------------------------------------------

      setBrandVoiceProfile: (profile) => set({ brandVoiceProfile: profile }),

      addContentBrief: (keyword, brief) => set((s) => ({
        contentBriefs: { ...s.contentBriefs, [keyword]: brief },
      })),

      postAgentMessage: (msg) => set((s) => ({
        agentMessages: [
          ...s.agentMessages,
          { ...msg, timestamp: Date.now() },
        ].slice(-300),
      })),

      getAgentMessages: (agentId) => {
        return get().agentMessages.filter(
          (m) => m.to === agentId || m.to === 'all',
        );
      },

      addDeadline: (deadline) => set((s) => ({
        deadlines: [...s.deadlines, deadline].slice(0, 500),
      })),

      updateDeadline: (contentId, stage, updates) => set((s) => ({
        deadlines: s.deadlines.map((d) =>
          d.contentId === contentId && d.stage === stage
            ? { ...d, ...updates }
            : d,
        ),
      })),

      // -----------------------------------------------------------------------
      // Review queue actions
      // -----------------------------------------------------------------------

      addToQueue: (item) => {
        const queueItem = createQueueItem(item);
        set((s) => ({
          reviewQueue: [queueItem, ...s.reviewQueue].slice(0, 1000),
        }));
        return queueItem;
      },

      approveItem: (id) => {
        const state = get();
        const item = state.reviewQueue.find((q) => q.id === id);
        if (!item || item.status !== 'pending') return;

        // Mark approved in queue
        set({ reviewQueue: markApproved(state.reviewQueue, id) });

        // Dispatch the side-effect
        const s = get();
        dispatchApproval(item, {
          addKeyword: s.addKeyword,
          addContent: s.addContent as unknown as (c: Record<string, unknown>) => void,
          updateContentItem: s.updateContentItem as unknown as (id: number, updates: Record<string, unknown>) => void,
          addPlannedContent: s.addPlannedContent as unknown as (plans: Array<Record<string, unknown>>) => void,
        });
      },

      rejectItem: (id, reason) => {
        set((s) => ({
          reviewQueue: markRejected(s.reviewQueue, id, reason),
        }));
      },

      reviseItem: (id, revisedData) => {
        set((s) => ({
          reviewQueue: markRevised(s.reviewQueue, id, revisedData),
        }));
      },

      bulkApproveQueue: (type) => {
        const state = get();
        const { queue, count } = bulkApproveItems(state.reviewQueue, type);
        set({ reviewQueue: queue });

        // Dispatch side-effects for each approved item
        const s = get();
        const approvedItems = queue.filter(
          (q) => q.status === 'approved' && q.reviewedAt && q.reviewedAt > Date.now() - 1000,
        );
        for (const item of approvedItems) {
          dispatchApproval(item, {
            addKeyword: s.addKeyword,
            addContent: s.addContent as unknown as (c: Record<string, unknown>) => void,
            updateContentItem: s.updateContentItem as unknown as (id: number, updates: Record<string, unknown>) => void,
            addPlannedContent: s.addPlannedContent as unknown as (plans: Array<Record<string, unknown>>) => void,
          });
        }
        return count;
      },

      bulkRejectQueue: (type, reason) => {
        const state = get();
        const { queue, count } = bulkRejectItems(state.reviewQueue, type, reason);
        set({ reviewQueue: queue });
        return count;
      },

      clearQueue: (status) => {
        if (status) {
          set((s) => ({
            reviewQueue: s.reviewQueue.filter((q) => q.status !== status),
          }));
        } else {
          set((s) => ({
            reviewQueue: s.reviewQueue.filter((q) => q.status === 'pending'),
          }));
        }
      },

      // -----------------------------------------------------------------------
      // Supabase full load
      // -----------------------------------------------------------------------

      loadFromSupabase: async (workspaceId: string) => {
        const data = await loadWorkspaceData(workspaceId);
        if (!data) return; // Supabase unavailable — keep localStorage data

        set({
          workspaceId,
          content: data.content.length > 0 ? data.content : get().content,
          collections: data.collections.length > 0 ? data.collections : get().collections,
          keywords: data.keywords.length > 0 ? data.keywords : get().keywords,
          media: data.media.length > 0 ? data.media : get().media,
          pipeline: data.pipeline.length > 0 ? data.pipeline : get().pipeline,
        });
      },
    }),
    {
      name: 'conduit-workspace',
      partialize: (state) => ({
        workspaceId: state.workspaceId,
        userId: state.userId,
        isAuthenticated: state.isAuthenticated,
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
        agentRuntimeMemories: state.agentRuntimeMemories,
        autopilot: state.autopilot,
        autopilotEngineConfig: state.autopilotEngineConfig,
        autopilotEngineState: state.autopilotEngineState,
        publishLimits: state.publishLimits,
        publishLog: state.publishLog,
        repurposeConfig: state.repurposeConfig,
        repurposedContent: state.repurposedContent,
        socialCalendar: state.socialCalendar,
        reviewQueue: state.reviewQueue,
        contentHistory: state.contentHistory,
        brandVoiceProfile: state.brandVoiceProfile,
        contentBriefs: state.contentBriefs,
        agentMessages: state.agentMessages,
        deadlines: state.deadlines,
        notifications: state.notifications,
        onboardingComplete: state.onboardingComplete,
        pipelinePreset: state.pipelinePreset,
        pipelineNodeConfig: state.pipelineNodeConfig,
        pipelineEvents: state.pipelineEvents,
        costEntries: state.costEntries,
        domain: state.domain,
        niche: state.niche,
        targetAudience: state.targetAudience,
        contentGoal: state.contentGoal,
        competitors: state.competitors,
      }),
    }
  )
);
