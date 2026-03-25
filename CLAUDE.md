# Conduit CMS — Claude Code Context

## What this is
Conduit is an AI-native content management platform. White-label product. Target: Indian content publishers, finance bloggers, comparison sites.

## File structure
- index.html — marketing site
- app.html — main CMS (7500+ lines, vanilla JS, 'use strict' at top)
- admin.html — owner admin panel
- conduit-lite.html — light theme version
- api/ — Vercel serverless functions (Node.js)
- supabase-schema.sql — run once in Supabase SQL editor
- supabase-adapter.js — reference, not yet wired

## CRITICAL: app.html architecture
- 'use strict' is at the very top of the script block
- All page functions MUST be declared as: function pgXxx(){ }
- NEVER use: pgXxx = function(){ } — breaks under strict mode (ReferenceError)
- All action functions exposed to window: window.fnName = fnName
- State object S holds everything — DB.get/set writes to localStorage
- save(key) persists S[key] to localStorage
- buildNav() and go(page) handle all navigation
- callAI() handles all AI requests — routes to active provider

## Tech stack
- Frontend: vanilla JS, no framework, single HTML files
- Backend: Vercel serverless functions in api/ folder
- Database: Supabase (PostgreSQL + Auth + Row Level Security)
- Payments: Stripe Checkout + webhooks
- Email: Resend
- AI: Anthropic Claude (primary), multi-provider support built in

## Environment variables (set in Vercel dashboard)
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID
RESEND_API_KEY

## Database (Supabase)
Schema is in supabase-schema.sql — 14 tables with RLS policies.
Key tables: workspaces, content, collections, keywords, media, webhook_logs, audit_log, profiles, workspace_members

## What's built (DO NOT rebuild these)
- Complete frontend with 25+ pages, all UI, modals, nav
- Two-tier collapsible nav system
- AI Studio with 21 tools and pinned row
- Creator Studio (YouTube, Shorts, Reels)
- Visual Studio (Thumbnails, Featured Images, Infographics)
- Media Library with Pexels/Pixabay/upload/AI prompt
- Monetisation (Affiliate Products, Ad Placements)
- Content Links (orphan detection, interlink suggestions)
- Prompt Library with 33 built-in prompts + autocomplete
- Version history, scheduled publishing, empty states
- Stripe config UI in Settings & Billing
- Admin panel with 8 pages

## What needs to be built (do in this order)
1. api/ai-proxy.js — AI calls via backend, free quota system
2. api/stripe-webhook.js — handle checkout.session.completed
3. api/send-email.js — transactional emails via Resend
4. Supabase auth wiring in app.html

## Rules — never break these
- Never rewrite page functions unless explicitly asked
- Never change CSS variables or styling
- Never change the nav system
- localStorage writes must be instant — Supabase sync is async
- Always use var/let/const — never implicit globals
- Run node --check after any JS changes to app.html
- All api/*.js functions must handle OPTIONS (CORS preflight)
