# Conduit CMS

AI-native content management platform for publishers.

## Stack
- Frontend: Vanilla JS (app.html, index.html, admin.html)
- Backend: Vercel serverless functions (api/)
- Database: Supabase (PostgreSQL + Auth)
- Payments: Stripe
- Email: Resend
- AI: Anthropic Claude + multi-provider

## Setup
1. Clone repo
2. Copy .env.example to .env.local and fill in values
3. Run supabase-schema.sql in Supabase SQL Editor
4. Deploy to Vercel — add env vars in dashboard

## Admin panel
Open /admin.html — password: conduit-admin-2026
