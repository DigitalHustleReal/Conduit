# Conduit — AI-Native Content Operations Platform

## Vision
Conduit is the operating system for content-first businesses. Not another SEO tool. Not another CMS. The first platform where AI agents handle content operations end-to-end — from keyword research to publishing to performance monitoring — while humans make strategic decisions.

## Mission
Give every content creator, publisher, and small agency the power of a 10-person content team through autonomous AI agents, without requiring enterprise budgets or technical expertise.

## Target Market
- Indian content publishers (finance, tech, comparison sites)
- Solo creators scaling from 1 to 100+ articles/month
- Small agencies managing 5-20 client sites
- Niche site builders (programmatic SEO, affiliate content)

## Competitive Position
Conduit does NOT compete with Ahrefs/SEMrush on SERP data. It competes on AI-powered content operations — the space between "keyword found" and "article ranking."

| What we beat | Why |
|-------------|-----|
| WordPress + plugins | All-in-one, no plugin conflicts, AI-native |
| Jasper/Copy.ai | Full CMS + pipeline, not just AI text generator |
| Notion/Monday.com | Built for content ops, not generic project management |
| Manual workflows | 8 autonomous agents replace repetitive work |

| What we don't beat (yet) | Why | Path forward |
|--------------------------|-----|--------------|
| Ahrefs keyword data | They crawl the web, we use AI estimates | Integrate Google Search Console API for real data |
| RankMath on-page SEO | They hook into WordPress editor | Our heuristic + AI scoring is comparable for standalone |
| SEMrush competitive analysis | Real SERP database | Can't match, but AI can estimate gaps |

## Monetization
**SaaS subscription model** with usage-based AI credits:

| Plan | Price | AI Calls | Target User |
|------|-------|----------|-------------|
| Free | $0 | 10/month | Try before buy |
| Pro | $29/month | 1,000/month | Solo creators |
| Business | $99/month | 10,000/month | Agencies, teams |
| BYOK (Bring Your Own Key) | Free forever | Unlimited | Power users with own API keys |

**Revenue streams:**
1. Subscriptions (primary) — recurring MRR
2. White-label licensing — agencies resell Conduit under their brand
3. Marketplace — premium prompt packs, agent templates, collection schemas

**Projection (Year 1):**
- Month 3: 50 free users, 10 Pro → $290 MRR
- Month 6: 200 free, 40 Pro, 5 Business → $1,655 MRR
- Month 12: 500 free, 100 Pro, 20 Business → $4,880 MRR
- Break-even at ~60 Pro subscribers ($1,740 MRR covers infrastructure)

## File Structure
```
index.html          — Marketing/landing page
app.html            — Main CMS application (8400+ lines, vanilla JS)
admin.html          — Platform admin panel
conduit-lite.html   — Light theme variant
api/
  ai-proxy.js       — AI calls with JWT auth + quota + Anthropic proxy
  create-checkout.js — Stripe Checkout session creation
  stripe-webhook.js  — Stripe event handler (checkout, subscription, payment)
  send-email.js      — Transactional emails via Resend (3 templates)
supabase-schema.sql — 14 tables with RLS policies
vercel.json         — Vercel config (CORS headers)
package.json        — Node dependencies
.env.example        — Required environment variables
```

## CRITICAL: app.html Architecture

### Coding Rules (never break these)
- `'use strict'` at top of script block — all functions MUST be declarations: `function pgXxx(){}`
- NEVER use: `pgXxx = function(){}` — causes ReferenceError under strict mode
- Expose action functions to window: `window.fnName = fnName`
- State object `S` holds all application data
- `DB.get(key, default)` / `DB.set(key, value)` — localStorage with `prism3_` prefix
- `save(key)` — writes `S[key]` to localStorage AND async syncs to Supabase
- `buildNav()` and `go(page)` — navigation system (do not modify)
- `callAI(prompt, options)` — unified AI dispatcher for all providers
- `toast(message, type)` — user notifications
- Never change CSS variables or styling
- Run `node --check` after any JS changes
- All `api/*.js` must handle OPTIONS for CORS preflight

### Core Systems
| System | Key Functions | Lines |
|--------|--------------|-------|
| State & Persistence | `S`, `DB`, `save()`, `_syncToSupabase()` | 662-780 |
| Navigation | `buildNav()`, `go()`, `renderPage()` | 884-1040 |
| Credits | `planLimits()`, `deductCredit()`, `updateCreditMeter()` | 1042-1060 |
| Scoring | `heuristicAIScore()`, `heuristicSEOScore()`, `scoreSEO()` | 1068-1115 |
| Event Tracking | `trackEvent()` | 1114-1122 |
| Automations | `dispatchAutomation()`, `executeAutomationAction()` | 1125-1172 |
| AI Providers | `AI_PROVIDERS`, `callAI()`, `ai()` | 1177-1345 |
| AI Panel | `buildAIPanel()`, prompt autocomplete | 1356-1530 |
| Quality Gates | `checkQualityGates()`, `enforceQualityGates()` | ~4570 |
| Webhooks | `fireWebhook()`, `logWebhook()` | ~3632 |
| Scheduled Publish | `checkScheduledPublish()` (runs every 60s) | ~7588 |
| Agents | `agentStart/Stop/SetEnabled()`, 8 agents, `pgAgents()` | ~7610-8360 |
| Auth | `showAuthScreen()`, `loadWorkspace()`, `initConduit()` | ~7870-8400 |

### AI Provider Support (5 providers)
- Anthropic Claude (primary) — via `/api/ai-proxy` or direct API
- OpenAI GPT-4 — direct API
- Google Gemini — direct API
- Mistral — direct API
- Groq (fastest) — direct API

### 8 Autonomous Agents
| Agent | Type | Interval | Credits |
|-------|------|----------|---------|
| Content Autopilot | AI, manual | On demand | ~5/article |
| SEO Guardian | Heuristic scan + AI fix | 5 min | 0 scan, 1/fix |
| Keyword Opportunity | AI | On demand | 1/run |
| Pipeline Manager | Heuristic | 2 min | 0 |
| Smart Onboarding | AI, one-time | Auto on empty workspace | ~3 |
| Health Monitor | Heuristic | 10 min | 0 |
| Content Refresh | AI | On demand | 1/article |
| Interlink Builder | AI | On demand | 1/run |

## Tech Stack
- **Frontend:** Vanilla JS, no framework, single HTML files
- **Backend:** Vercel serverless functions (Node.js)
- **Database:** Supabase (PostgreSQL + Auth + RLS) — 14 tables
- **Payments:** Stripe Checkout + webhooks
- **Email:** Resend (3 templates: welcome, usage warning, upgrade)
- **AI:** Multi-provider (Claude, GPT-4, Gemini, Mistral, Groq)
- **Hosting:** Vercel (auto-deploy from GitHub main branch)

## Database (Supabase)
14 tables: profiles, workspaces, workspace_members, collections, content, content_versions, keywords, media, pipeline, affiliate_products, webhooks, webhook_logs, audit_log, analytics_events

All tables have RLS policies. Service role used by API functions for cross-workspace operations.

## Environment Variables
```
SUPABASE_URL               — Project URL
SUPABASE_ANON_KEY          — Public anon key
SUPABASE_SERVICE_ROLE_KEY  — Service role key (backend only)
ANTHROPIC_API_KEY          — Platform AI key
STRIPE_SECRET_KEY          — Stripe secret
STRIPE_PUBLISHABLE_KEY     — Stripe publishable
STRIPE_WEBHOOK_SECRET      — Stripe webhook signing
STRIPE_PRO_PRICE_ID        — Pro plan price ID
STRIPE_BUSINESS_PRICE_ID   — Business plan price ID
RESEND_API_KEY             — Email API key
```

## What's Built (DO NOT rebuild)
- 35+ page functions with full UI
- Two-tier collapsible nav with drag-to-reorder
- AI Studio (21 tools, pinned row, chip panels)
- Creator Studio (YouTube, Shorts, Reels, Video SEO)
- Visual Studio (Thumbnails, Featured Images, Infographics)
- Media Library (Pexels/Pixabay/upload/AI prompt)
- Monetisation (Affiliate Products, Ad Placements)
- Content Links (orphan detection + AI interlink suggestions)
- Prompt Library (33 built-in + user-saved, autocomplete)
- Version history (10 versions per item, restore)
- Scheduled publishing (60s interval check)
- Quality gates (12 rules, enforced on all publish paths)
- Real SEO scoring (heuristic + async AI)
- Automation engine (9 triggers, 8 actions)
- Analytics with event tracking (7-day usage chart)
- Programmatic SEO generator
- 8 autonomous AI agents
- Supabase auth (Google OAuth + email/password)
- Data sync (localStorage + async Supabase)
- Stripe checkout (server-side session creation)
- Email system (3 templates, triggered on signup + usage + upgrade)
- Admin panel with Supabase queries

## Roadmap — Next Priorities
1. **Google Search Console API** — real ranking data in Analytics
2. **100+ micro-agents** — specific task agents for every content operation
3. **Meta-agents** — agents that monitor and optimize other agents
4. **Social distribution** — auto-post to LinkedIn/Twitter on publish
5. **Schema markup generator** — auto JSON-LD for all content types
6. **PageSpeed Insights** — Core Web Vitals in Analytics
7. **Readability scoring** — Flesch-Kincaid algorithm (local, no API)
8. **White-label mode** — custom branding per workspace
9. **investingpro.in integration** — headless publishing via API
10. **Marketplace** — premium prompts, agent templates, schemas
