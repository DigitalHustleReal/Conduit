@AGENTS.md

# Conduit Next.js App — AI-Native Content Operations Platform

## Tech Stack
- **Framework:** Next.js 16.2 (App Router, React 19, Turbopack)
- **Language:** TypeScript (strict)
- **State:** Zustand 5 (stores/)
- **UI:** shadcn/ui 4 + Tailwind CSS 4 + Lucide icons
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **Payments:** Stripe 21 (Checkout + webhooks)
- **Email:** Resend 6 (transactional)
- **AI:** Anthropic SDK (Claude) — multi-provider via lib/ai/
- **Theming:** next-themes + CSS variables (dark/light)

## File Structure

```
next/
  app/
    layout.tsx                  — Root layout (ThemeProvider, Toaster)
    page.tsx                    — Landing / marketing page
    (cms)/                      — Authenticated CMS route group
      layout.tsx                — CMS shell (Sidebar + Topbar + AuthGuard)
      dashboard/page.tsx        — Main dashboard
      editor/page.tsx           — Content editor (list view)
      editor/new/page.tsx       — New content editor
      collections/page.tsx      — Collection manager
      ai-studio/page.tsx        — AI Studio (21 tools, prompts)
      ai-engine/page.tsx        — AI engine config (providers, BYOK)
      chat/page.tsx             — AI chat interface
      prompt-library/page.tsx   — Prompt library (built-in + user)
      seo/page.tsx              — SEO keywords + tracking
      analytics/page.tsx        — Analytics dashboard
      pipeline/page.tsx         — Content production pipeline
      media/page.tsx            — Media library (Pexels/Pixabay/upload/AI)
      agents/page.tsx           — 8 autonomous AI agents
      automations/page.tsx      — Automation engine (triggers + actions)
      webhooks/page.tsx         — Webhook management
      interlinks/page.tsx       — Internal link builder
      monetisation/page.tsx     — Affiliate products + ad placements
      social/page.tsx           — Social distribution (Twitter/LinkedIn)
      import/page.tsx           — Import hub (Notion/Sheets/CSV/JSON)
      creator/page.tsx          — Creator Studio hub
      creator/script/page.tsx   — Script generator
      creator/shorts/page.tsx   — Shorts/Reels generator
      creator/research/page.tsx — Topic research
      creator/seo/page.tsx      — Video SEO
      visuals/page.tsx          — Visual Studio hub
      visuals/thumbnails/page.tsx   — Thumbnail generator
      visuals/featured/page.tsx     — Featured image generator
      visuals/infographics/page.tsx — Infographic generator
      prog-seo/page.tsx         — Programmatic SEO
      geo-seo/page.tsx          — Geo/local SEO
      localization/page.tsx     — Content localization
      algo-updates/page.tsx     — Algorithm update tracker
      templates/page.tsx        — Content templates
      integrations/page.tsx     — Third-party integrations
      team/page.tsx             — Team management
      api-playground/page.tsx   — API playground / headless CMS
      settings/page.tsx         — Workspace settings
    api/
      gsc/auth/route.ts         — Google Search Console OAuth start
      gsc/callback/route.ts     — GSC OAuth callback
      gsc/data/route.ts         — GSC performance data fetch
      gsc/sites/route.ts        — GSC site list
      social/twitter/route.ts   — Post to Twitter/X
      social/linkedin/route.ts  — Post to LinkedIn
      social/auth/[provider]/route.ts     — Social OAuth start
      social/callback/[provider]/route.ts — Social OAuth callback
      import/notion/route.ts    — Import from Notion
      import/notion/auth/route.ts      — Notion OAuth start
      import/notion/callback/route.ts  — Notion OAuth callback
      import/sheets/route.ts    — Import from Google Sheets
      revalidate/route.ts       — On-demand ISR revalidation
    privacy/page.tsx            — Privacy policy (footer)
    terms/page.tsx              — Terms of service (footer)
    security/page.tsx           — Security page (footer)
    about/page.tsx              — About page (footer)
    contact/page.tsx            — Contact page (footer)
    blog/page.tsx               — Blog (footer)
    changelog/page.tsx          — Changelog (footer)
    docs/page.tsx               — Documentation hub (footer)
    docs/api/page.tsx           — API docs (footer)
    docs/agents/page.tsx        — Agent docs (footer)
  components/
    ui/                         — shadcn/ui primitives (button, card, input, badge, progress, sonner)
    layout/
      Sidebar.tsx               — Two-tier collapsible nav
      Topbar.tsx                — Top bar (search, credits, theme, user)
    AuthGuard.tsx               — Redirect to login if not authenticated
    OnboardingGate.tsx          — Show onboarding wizard for new users
    OnboardingWizard.tsx        — Step-by-step onboarding flow
    ThemeToggle.tsx             — Dark/light mode toggle
    HeroDemo.tsx                — Animated product demo for landing page
  lib/
    utils.ts                    — cn() helper (clsx + tailwind-merge)
    theme.ts                    — Theme utilities
    credits.ts                  — Plan limits + credit deduction
    social.ts                   — Social posting helpers (Twitter/LinkedIn)
    import.ts                   — Import logic (Notion/Sheets/CSV/JSON)
    gsc.ts                      — Google Search Console client
    headless-client.ts          — Headless CMS API client
    ai/
      providers.ts              — AI provider registry (Claude, GPT-4, Gemini, Mistral, Groq)
      call-ai.ts                — Unified AI dispatcher
    scoring/
      seo-score.ts              — Heuristic SEO scoring
      ai-score.ts               — AI-powered content scoring
      readability.ts            — Flesch-Kincaid readability
      analyze.ts                — Combined content analysis
    supabase/
      client.ts                 — Browser Supabase client
      server.ts                 — Server-side Supabase client
      auth.ts                   — Auth helpers (session, user)
      sync.ts                   — Data sync (localStorage + Supabase)
  stores/
    workspace.ts                — Zustand workspace store (content, collections, keywords, settings)
  types/
    agent.ts                    — Agent type definitions
    content.ts                  — Content type definitions
    workspace.ts                — Workspace type definitions
  public/                       — Static assets
  docs/                         — Internal documentation
```

## Coding Rules

### General
- Use `'use client'` directive on ALL interactive pages and components (anything with useState, useEffect, event handlers, Zustand)
- Server components are the default in Next.js App Router; only add `'use client'` when needed
- Use CSS variables for theming (dark/light) — never hardcode colors
- All API routes go in `app/api/` as `route.ts` files
- Use `next-themes` ThemeProvider for dark/light mode — do not roll custom theme logic
- Toast notifications via `sonner` — use `toast()` from sonner, not custom toasts

### TypeScript
- Strict mode enabled — no `any` unless absolutely necessary
- Define types in `types/` for shared interfaces
- Use Zod or manual validation in API routes

### Components
- shadcn/ui for all UI primitives (Button, Card, Input, Badge, Progress)
- Lucide icons only — do not use other icon libraries
- Component files use PascalCase: `AuthGuard.tsx`, `ThemeToggle.tsx`
- Keep page components in their page.tsx files; extract reusable pieces to `components/`

### State Management
- Zustand for global client state (workspace data, user preferences)
- React state (useState) for local component state
- Supabase for persistent data — sync via `lib/supabase/sync.ts`

### API Routes
- All API routes must handle errors with try/catch and return appropriate status codes
- Use `lib/supabase/server.ts` for server-side Supabase access
- Validate request bodies before processing
- Return JSON responses with consistent shape: `{ data?, error? }`

### Styling
- Tailwind CSS 4 with PostCSS — no CSS modules
- Use `cn()` from `lib/utils.ts` to merge class names
- CSS variables defined in root layout for theme colors
- Responsive design: mobile-first with sm/md/lg breakpoints

## Environment Variables

| Variable | Required | Used By |
|----------|----------|---------|
| SUPABASE_URL | Yes | Server + client |
| SUPABASE_ANON_KEY | Yes | Client (public) |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Server only |
| ANTHROPIC_API_KEY | For platform AI | AI routes |
| STRIPE_SECRET_KEY | For payments | Stripe routes |
| STRIPE_PUBLISHABLE_KEY | For payments | Client checkout |
| STRIPE_WEBHOOK_SECRET | For payments | Webhook verification |
| STRIPE_PRO_PRICE_ID | For payments | Checkout sessions |
| STRIPE_BUSINESS_PRICE_ID | For payments | Checkout sessions |
| RESEND_API_KEY | For email | Email routes |
| RESEND_FROM | For email | Email sender address |
| SITE_URL | Yes | Redirects, emails |
| SITE_NAME | Yes | Branding |
| NEXT_PUBLIC_APP_URL | Yes | Client-side links |
| NEXT_PUBLIC_SUPABASE_URL | Yes | Client Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Client Supabase |
| GOOGLE_CLIENT_ID | For GSC | GSC OAuth |
| GOOGLE_CLIENT_SECRET | For GSC | GSC OAuth |
| GOOGLE_SHEETS_API_KEY | For import | Sheets import |
| TWITTER_CLIENT_ID | For social | Twitter OAuth |
| TWITTER_CLIENT_SECRET | For social | Twitter OAuth |
| TWITTER_ACCESS_TOKEN | For social | Twitter posting |
| TWITTER_REFRESH_TOKEN | For social | Twitter token refresh |
| LINKEDIN_CLIENT_ID | For social | LinkedIn OAuth |
| LINKEDIN_CLIENT_SECRET | For social | LinkedIn OAuth |
| LINKEDIN_ACCESS_TOKEN | For social | LinkedIn posting |
| NOTION_CLIENT_ID | For import | Notion OAuth |
| NOTION_CLIENT_SECRET | For import | Notion OAuth |
| CONDUIT_WEBHOOK_SECRET | For webhooks | Webhook signing |

## Database (Supabase — 17 Tables)

| # | Table | Purpose |
|---|-------|---------|
| 1 | profiles | User profiles (mirrors auth.users) |
| 2 | workspaces | Workspace config, plan, credits, Stripe IDs |
| 3 | workspace_members | Team membership (admin/editor/viewer) |
| 4 | collections | Content collection schemas |
| 5 | content | Articles, pages, posts |
| 6 | content_versions | Version history (10 per item) |
| 7 | keywords | SEO keyword tracking |
| 8 | media | Media library (uploads, stock, AI) |
| 9 | pipeline | Content production workflow stages |
| 10 | affiliate_products | Monetisation product catalog |
| 11 | webhooks | Webhook endpoint config |
| 12 | webhook_logs | Webhook delivery logs |
| 13 | audit_log | User action audit trail |
| 14 | analytics_events | Page views, events, visitor data |
| 15 | social_posts | Social distribution queue (Twitter/LinkedIn) |
| 16 | import_history | Content import tracking (Notion/Sheets/CSV/JSON) |
| 17 | agent_suggestions | AI agent suggestions for human review |

All tables have RLS policies scoped to workspace membership.

## What's Built
- 48 pages (37 CMS pages + 11 marketing/footer pages)
- 13 API routes (GSC, social posting, import, revalidation)
- Two-tier collapsible sidebar navigation
- AI Studio with 21 tools and prompt library
- Creator Studio (YouTube scripts, Shorts, research, video SEO)
- Visual Studio (thumbnails, featured images, infographics)
- Media library (Pexels/Pixabay/upload/AI generation)
- Monetisation (affiliate products, ad placements)
- Content editor with SEO + AI + readability scoring
- Internal link builder (orphan detection + AI suggestions)
- 8 autonomous AI agents
- Automation engine (triggers + actions)
- Pipeline / Kanban workflow
- Analytics dashboard
- Social distribution (Twitter/LinkedIn auto-post)
- Import hub (Notion/Sheets/CSV/JSON)
- Onboarding wizard for new users
- Google Search Console integration
- Programmatic SEO + Geo SEO + Localization
- Algorithm update tracker
- Supabase auth (Google OAuth + email/password)
- Stripe checkout (Pro + Business plans)
- Dark/light theme with CSS variables
- Headless CMS API client

## What's Planned
1. 100+ micro-agents (specific task agents for every content operation)
2. Meta-agents (agents that monitor and optimize other agents)
3. Schema markup generator (auto JSON-LD for all content types)
4. PageSpeed Insights (Core Web Vitals in Analytics)
5. White-label mode (custom branding per workspace)
6. Marketplace (premium prompts, agent templates, schemas)
7. WordPress plugin sync (already built for legacy app.html, needs Next.js integration)
