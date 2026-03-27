@AGENTS.md

# Conduit — AI-Native Content Operations Platform

## What This Is
Conduit is a production SaaS platform where autonomous AI agents handle the entire content lifecycle — from keyword research to writing, SEO optimization, distribution, and performance monitoring. Built by DigitalHustle.

**Live:** conduit-woad.vercel.app
**Repo:** github.com/DigitalHustleReal/Conduit
**Supabase:** swctotzcjhnqyaddqxni.supabase.co

## Tech Stack
- **Framework:** Next.js 16.2 (App Router, React 19, Turbopack)
- **Language:** TypeScript (strict)
- **State:** Zustand 5 (stores/)
- **UI:** shadcn/ui 4 + Tailwind CSS 4 + Lucide icons
- **Database:** Supabase (PostgreSQL + Auth + RLS) — 17 tables
- **Payments:** Stripe 21 (Checkout + webhooks) — pending India invite
- **Email:** Resend 6 (transactional) — 3 templates
- **AI:** Anthropic Claude (primary) + OpenAI, Gemini, Mistral, Groq via lib/ai/
- **Theming:** Custom theme toggle (dark/light/system) with CSS variables
- **Brand:** Command Center theme — navy (#0a0f1e) + electric blue (#3b82f6)

## Architecture

```
Root (Next.js App Router)
├── app/
│   ├── layout.tsx                  — Root layout (theme script, Toaster)
│   ├── page.tsx                    — Landing page (hero, features, pricing, FAQ)
│   ├── (cms)/                      — Authenticated CMS route group
│   │   ├── layout.tsx              — CMS shell (AuthGuard + OnboardingGate + Sidebar + Topbar)
│   │   ├── dashboard/              — Mission control dashboard
│   │   ├── editor/                 — Content editor (list + new/edit)
│   │   ├── collections/            — Collection schemas
│   │   ├── ai-studio/              — 21 AI tools (wired to callAI)
│   │   ├── ai-engine/              — Provider config (5 providers, BYOK)
│   │   ├── chat/                   — Multi-turn AI chat with workspace context
│   │   ├── prompt-library/         — 33 built-in prompts
│   │   ├── seo/                    — SEO center + GSC real data
│   │   ├── analytics/              — Analytics + GSC search console tab
│   │   ├── pipeline/               — Kanban board (Backlog→Writing→Review→Published)
│   │   ├── media/                  — Media library (upload, drag-drop)
│   │   ├── agents/                 — Agent dashboard (8 core + hierarchy)
│   │   ├── automations/            — Event-driven automation rules
│   │   ├── webhooks/               — Webhook management
│   │   ├── interlinks/             — Internal link builder + orphan detection
│   │   ├── monetisation/           — Affiliate products + ad placements
│   │   ├── social/                 — Social posting (Twitter/LinkedIn)
│   │   ├── import/                 — Import hub (Notion/Sheets/CSV/JSON)
│   │   ├── creator/                — Creator Studio (scripts, shorts, research, video SEO)
│   │   ├── visuals/                — Visual Studio (thumbnails, featured, infographics)
│   │   ├── prog-seo/               — Programmatic SEO
│   │   ├── geo-seo/                — GEO/AI search optimization
│   │   ├── localization/           — Multi-language (16 languages)
│   │   ├── algo-updates/           — Google algorithm tracker
│   │   ├── templates/              — Content templates (8 types)
│   │   ├── integrations/           — Third-party integrations (9 services)
│   │   ├── team/                   — Team management + roles
│   │   ├── api-playground/         — Headless CMS API tester
│   │   └── settings/               — Workspace settings + billing
│   ├── admin/                      — Password-protected admin panel
│   │   ├── layout.tsx              — Admin shell (password: conduit-admin-2026)
│   │   ├── page.tsx                — Overview dashboard
│   │   ├── users/                  — All platform users
│   │   ├── workspaces/             — All workspaces
│   │   ├── content/                — All content across workspaces
│   │   ├── ai-usage/               — AI call analytics
│   │   ├── system/                 — DB health + env check
│   │   └── finance/                — Revenue, expenses, customers, projections
│   ├── api/                        — 25 API routes
│   │   ├── ai-proxy/               — AI proxy (JWT auth, quota, multi-provider)
│   │   ├── content/                — Public headless CMS API
│   │   ├── checkout/               — Stripe checkout session
│   │   ├── stripe-webhook/         — Stripe webhook handler
│   │   ├── email/                  — Transactional emails (Resend)
│   │   ├── rss/                    — RSS feed
│   │   ├── sitemap/                — XML sitemap
│   │   ├── schema/                 — JSON-LD schema
│   │   ├── search/                 — Full-text search
│   │   ├── export/                 — Data export (CSV/JSON)
│   │   ├── notify/                 — Webhook notifications (HMAC signed)
│   │   ├── preview/                — Draft preview
│   │   ├── revalidate/             — ISR revalidation endpoint
│   │   ├── gsc/                    — Google Search Console (auth, callback, data, sites)
│   │   ├── social/                 — Social posting (twitter, linkedin, auth, callback)
│   │   ├── import/                 — Notion + Sheets import
│   │   └── admin/                  — Admin API (stats, users, workspaces, content, finance)
│   ├── privacy/                    — Privacy policy
│   ├── terms/                      — Terms of service
│   ├── security/                   — Security page
│   ├── about/                      — About page
│   ├── contact/                    — Contact form
│   ├── blog/                       — Blog (coming soon)
│   ├── changelog/                  — Version changelog
│   └── docs/                       — Documentation (hub, API ref, agents)
├── components/
│   ├── ui/                         — shadcn/ui (button, card, input, badge, progress, sonner)
│   ├── layout/
│   │   ├── Sidebar.tsx             — Two-tier collapsible nav (Command Center style)
│   │   └── Topbar.tsx              — Breadcrumbs, credits, theme toggle, user
│   ├── AuthGuard.tsx               — Supabase auth gate (Google OAuth + email/password)
│   ├── OnboardingGate.tsx          — Triggers onboarding for new workspaces
│   ├── OnboardingWizard.tsx        — 5-step guided setup
│   ├── ThemeToggle.tsx             — Dark/Light/System with SVG icons
│   └── HeroDemo.tsx                — 5-phase animated product demo (15s loop)
├── lib/
│   ├── utils.ts                    — cn() helper
│   ├── theme.ts                    — Theme persistence (localStorage)
│   ├── credits.ts                  — Plan limits + credit deduction
│   ├── social.ts                   — Social post generation + scheduling
│   ├── import.ts                   — CSV/JSON client-side parsers + Notion/Sheets helpers
│   ├── gsc.ts                      — Google Search Console client
│   ├── headless-client.ts          — ConduitClient SDK for any frontend
│   ├── stripe.ts                   — Stripe checkout + portal helpers
│   ├── ai/
│   │   ├── providers.ts            — 5 AI providers (Claude, GPT-4, Gemini, Mistral, Groq)
│   │   └── call-ai.ts             — Unified dispatcher (streaming, BYOK, session auth)
│   ├── scoring/
│   │   ├── seo-score.ts            — Dynamic SEO scoring (benchmarks against workspace)
│   │   ├── ai-score.ts             — AI content quality scoring
│   │   ├── readability.ts          — Flesch-Kincaid readability
│   │   └── analyze.ts              — Combined analysis
│   └── supabase/
│       ├── client.ts               — LAZY browser client (prevents SSG crash)
│       ├── server.ts               — Server-side client (service role)
│       ├── auth.ts                 — Auth helpers (Google, email, workspace bootstrap)
│       └── sync.ts                 — Upsert sync (content, keywords, collections, media, pipeline)
├── stores/
│   └── workspace.ts                — Zustand store (localStorage + Supabase sync)
├── types/
│   ├── agent.ts                    — Agent types (tier, triggers, cooldown, observe)
│   ├── content.ts                  — Content types
│   └── workspace.ts                — Workspace + settings types
├── legacy/                         — Old HTML files (app.html, admin.html, index.html)
├── wordpress-plugin/               — WordPress sync plugin (7 files)
├── docs/                           — Internal docs (HEADLESS-CMS.md)
└── supabase-schema.sql             — Full database schema (17 tables + RLS)
```

## Agent System (HTML legacy — app.html)
The HTML version has the full autonomous agent system:
- **121 micro-agents** with tier (1=human approval, 2=auto-apply), triggers, cooldown, observe
- **Event bus:** dispatchAgentEvent → processAgentQueue (budget-gated)
- **Lifecycle events:** content.created, content.updated, content.published, keyword.added, daily, weekly, monthly
- **Hierarchy:** Conductor → 4 Directors (SEO, Content, Growth, Technical) → Workers
- **Autopilot mode:** daily budget, auto-scheduling
- **Feedback flywheel:** agent effectiveness tracking, memory, chains

## Coding Rules

### Critical
- **NEVER hardcode dark colors** — use CSS variables (bg-background, text-foreground, bg-card, bg-muted, border-border, text-muted-foreground)
- **Supabase client is LAZY** — always use `getSupabase()`, never import `createClient` at module level
- **Credits deducted AFTER success** — never before the AI call
- `'use client'` on ALL pages with useState/useEffect/Zustand

### General
- shadcn/ui for all UI primitives
- Lucide icons only
- Tailwind CSS 4 — no CSS modules
- `cn()` from `lib/utils.ts` for class merging
- Toast via `sonner` — `toast.success()`, `toast.error()`
- API routes: try/catch, return `{ data?, error? }`, handle OPTIONS for CORS

### State
- Zustand for client state (workspace.ts)
- localStorage as fallback when Supabase unavailable
- All Supabase sync is async, non-blocking, fire-and-forget with console.warn on failure

## Environment Variables (Vercel)

**Required (set, all environments):**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

**Optional (add when ready):**
- `ADMIN_PASSWORD` (default: conduit-admin-2026)
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`
- Resend: `RESEND_API_KEY`, `RESEND_FROM`
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Twitter: `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_REFRESH_TOKEN`
- LinkedIn: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_ACCESS_TOKEN`
- Notion: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`
- `CONDUIT_WEBHOOK_SECRET`

## Database (17 Tables)
profiles, workspaces, workspace_members, collections, content, content_versions, keywords, media, pipeline, affiliate_products, webhooks, webhook_logs, audit_log, analytics_events, social_posts, import_history, agent_suggestions

All with RLS policies scoped to workspace membership.

## What's Built (Complete)
- 58 pages (37 CMS + 11 admin + 10 public/footer)
- 25 API routes
- 121 autonomous AI agents (event-driven, tiered, budget-gated)
- 5-phase animated product demo on landing page
- Command Center theme (navy + electric blue, dark/light/system)
- Premium pricing with annual/monthly toggle
- Mission control dashboard with glass-morphism cards
- Supabase auth (Google OAuth + email/password) + data sync
- Google Search Console integration (real ranking data)
- Social media posting (Twitter/LinkedIn OAuth + API)
- Import hub (Notion/Sheets/CSV/JSON with mapping UI)
- 5-step onboarding wizard
- WordPress plugin (sync Conduit → WordPress)
- Headless CMS SDK (ConduitClient for any frontend)
- Content editor with live SEO/AI/readability scoring
- Admin panel with finance dashboard (MRR, projections, expenses)

## What's Next (Priority Order)
1. **Fix admin login** — ADMIN_PASSWORD env var in Vercel
2. **Razorpay integration** — replace Stripe for India (Stripe invite-only)
3. **Real product demo video** — screen recording of actual CMS workflow
4. **First 10 users** — post on IndieHackers, Reddit, Twitter
5. **Connect investingpro.in** — headless CMS webhook + ISR
6. **WordPress.org submission** — distribute the plugin
7. **Marketplace** — premium prompt packs, agent templates
8. **White-label mode** — agency rebranding
