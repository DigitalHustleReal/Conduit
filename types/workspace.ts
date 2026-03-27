export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'business';
  settings: WorkspaceSettings;
  credits_ai_calls?: number;
  credits_ai_limit?: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
}

export interface WorkspaceSettings {
  vercelHook?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  siteDomain?: string;
  aiModel: string;
  aiProvider: string;
  defaultLocale: string;
  pexelsKey?: string;
  pixabayKey?: string;
  mediaView: 'grid' | 'list';
  contentTypes: string[];
  activeLangs: string[];
  defaultLang: string;
  currency: string;
  integrations: Record<string, unknown>;
  openaiKey?: string;
  geminiKey?: string;
  mistralKey?: string;
  groqKey?: string;
  stripePublishableKey?: string;
  stripePriceIds?: { pro: string; business: string };
  niche?: string;
  ytChannelName?: string;
  ytNiche?: string;
  ytTone?: string;
  gscRefreshToken?: string;
  gscSiteUrl?: string;
  gscConnectedAt?: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Writer' | 'Viewer';
  status: 'active' | 'invited' | 'disabled';
}

export interface Credits {
  aiCalls: number;
  aiLimit: number;
  storage: number;
  storageLimit: number;
  apiReqs: number;
  apiLimit: number;
  seats: number;
  seatLimit: number;
  socialPosts: number;
  socialLimit: number;
  resetDate: number;
}

export interface QualityGate {
  id: number;
  name: string;
  cat: string;
  enabled: boolean;
  type: string;
  op: string;
  val: number;
  action: 'block' | 'warn';
  desc: string;
}

export interface Automation {
  id: number;
  trigger: string;
  action: string;
  enabled: boolean;
}

export interface AutopilotConfig {
  enabled: boolean;
  creditBudget: {
    daily: number;
    weekly: number;
    used_today: number;
    used_week: number;
    last_reset: string | null;
    week_reset: string | null;
  };
  schedule: {
    conductor_interval: number;
    content_days: number[];
    seo_days: number[];
    distribution_days: number[];
    maintenance_days: number[];
  };
  rules: {
    min_seo_score: number;
    min_ai_score: number;
    max_articles_per_day: number;
    auto_publish: boolean;
    auto_distribute: boolean;
    auto_refresh_days: number;
    auto_fix_seo: boolean;
    auto_interlink: boolean;
  };
  log: AutopilotLogEntry[];
  stats: {
    total_runs: number;
    total_credits: number;
    articles_created: number;
    issues_fixed: number;
    distributions: number;
  };
}

export interface AutopilotLogEntry {
  ts: number;
  decisions: Array<{ director?: string; budget?: number; reason?: string; result?: string; credits?: number }>;
  budget_remaining: number;
}
