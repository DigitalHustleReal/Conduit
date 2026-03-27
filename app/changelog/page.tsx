import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Changelog — Conduit',
  description: 'What is new in Conduit. Release notes, new features, and improvements.',
};

const RELEASES = [
  {
    version: '1.0.0',
    date: 'March 27, 2026',
    title: 'Conduit 1.0 — The AI Content OS',
    highlights: true,
    changes: [
      { tag: 'New', items: [
        '45+ page Next.js application with full CMS functionality',
        '121 autonomous AI agents (8 core directors + 113 micro-agents)',
        'Command Center dark theme with premium UI',
        'Google Search Console integration for real ranking data',
        'Social media posting — auto-publish to Twitter/X and LinkedIn',
        'Import hub — bring content from Notion, Google Sheets, CSV, and JSON',
        'WordPress plugin for bidirectional sync',
        'Headless CMS API — REST endpoints for content, RSS, sitemap, and search',
        'Onboarding wizard with workspace setup flow',
        'AI Studio with 21 tools and prompt autocomplete',
        'Creator Studio for YouTube, Shorts, and Reels content',
        'Visual Studio for thumbnails, featured images, and infographics',
        'Programmatic SEO generator for scaled content production',
      ]},
      { tag: 'Infrastructure', items: [
        'Supabase backend with 14 tables and row-level security',
        'Stripe billing with Pro ($29/mo) and Business ($99/mo) plans',
        'BYOK (Bring Your Own Key) plan for unlimited AI with your own API keys',
        '5 AI providers: Anthropic Claude, OpenAI GPT-4, Google Gemini, Mistral, Groq',
        'Vercel serverless deployment with edge network',
        'Transactional email system via Resend (3 templates)',
      ]},
      { tag: 'Content Ops', items: [
        'Quality gates — 12 rules enforced on all publish paths',
        'Real SEO scoring (heuristic + async AI analysis)',
        'Version history with 10 versions per item and restore',
        'Scheduled publishing with 60-second interval checking',
        'Automation engine — 9 triggers, 8 actions',
        'Webhook system with delivery logging',
        'Content Links with orphan detection and AI interlink suggestions',
        'Prompt Library with 33 built-in prompts and user-saved templates',
        'Media Library with Pexels, Pixabay, upload, and AI generation',
      ]},
    ],
  },
  {
    version: '0.9.0',
    date: 'March 15, 2026',
    title: 'Beta — Core Platform',
    highlights: false,
    changes: [
      { tag: 'New', items: [
        'Initial app.html single-page application',
        'Vanilla JS architecture with state management',
        'Supabase auth with Google OAuth and email/password',
        'LocalStorage persistence with async Supabase sync',
        '8 core autonomous agents',
        'Two-tier collapsible navigation with drag-to-reorder',
        'Analytics with event tracking and 7-day usage chart',
      ]},
    ],
  },
  {
    version: '0.1.0',
    date: 'February 2026',
    title: 'Alpha — Proof of Concept',
    highlights: false,
    changes: [
      { tag: 'New', items: [
        'Initial prototype with content editor',
        'AI integration with Anthropic Claude',
        'Basic collection and keyword management',
        'Supabase schema design (14 tables)',
      ]},
    ],
  },
];

const TAG_COLORS: Record<string, string> = {
  New: 'bg-green-500/15 text-green-500 border-green-500/30',
  Infrastructure: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Content Ops': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Fix: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Conduit</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black mb-3">Changelog</h1>
        <p className="text-lg text-muted-foreground mb-8">New features, improvements, and fixes.</p>

        {/* Subscribe */}
        <div className="border border-border rounded-lg p-5 mb-12 bg-card">
          <h3 className="font-semibold mb-2">Subscribe to updates</h3>
          <p className="text-sm text-muted-foreground mb-3">Get notified when we ship new features.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="you@example.com"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Subscribe
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-16">
          {RELEASES.map((release) => (
            <article key={release.version} className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-block px-2.5 py-1 rounded text-xs font-mono font-bold ${
                  release.highlights
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  v{release.version}
                </span>
                <span className="text-sm text-muted-foreground">{release.date}</span>
              </div>

              <h2 className="text-xl font-bold mb-4">{release.title}</h2>

              <div className="space-y-6">
                {release.changes.map((group) => (
                  <div key={group.tag}>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mb-3 ${TAG_COLORS[group.tag] || 'bg-muted text-muted-foreground border-border'}`}>
                      {group.tag}
                    </span>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {group.items.map((item, i) => (
                        <li key={i} className="flex gap-2 leading-relaxed">
                          <span className="text-muted-foreground/50 shrink-0">&bull;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; 2026 Conduit by DigitalHustle</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
