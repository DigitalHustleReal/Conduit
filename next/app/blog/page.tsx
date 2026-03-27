import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — Conduit',
  description: 'Insights on content operations, AI agents, and SEO strategy from the Conduit team.',
};

const PLACEHOLDER_POSTS = [
  {
    title: 'Why AI Agents Are the Future of Content Operations',
    excerpt: 'The shift from AI-assisted writing to autonomous content operations is happening now. Here is what it means for publishers.',
    date: 'Coming soon',
    tag: 'AI Agents',
  },
  {
    title: 'From 1 to 100 Articles a Month: A Scaling Playbook',
    excerpt: 'How solo creators are using Conduit to scale their content output without sacrificing quality or burning out.',
    date: 'Coming soon',
    tag: 'Content Ops',
  },
  {
    title: 'The BYOK Advantage: Why Bring Your Own API Keys',
    excerpt: 'Using your own AI provider keys unlocks unlimited calls at zero platform cost. Here is how to set it up and which provider to choose.',
    date: 'Coming soon',
    tag: 'Tutorial',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Conduit</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black mb-3">Blog</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Insights on content operations, AI agents, and SEO strategy.
        </p>

        {/* Subscribe */}
        <div className="border border-primary/20 bg-primary/5 rounded-lg p-6 mb-12">
          <h3 className="font-semibold mb-2">Subscribe for updates</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get notified about new posts on content operations, AI agents, and SEO.
          </p>
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

        {/* Coming soon notice */}
        <div className="text-center py-8 mb-8">
          <div className="inline-block px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-4">
            Coming Soon
          </div>
          <p className="text-muted-foreground">
            We are preparing our first articles. Subscribe above to be notified when we publish.
          </p>
        </div>

        {/* Placeholder cards */}
        <div className="space-y-4">
          {PLACEHOLDER_POSTS.map((post) => (
            <article key={post.title} className="border border-border rounded-lg p-5 opacity-60">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  {post.tag}
                </span>
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>
              <h2 className="text-lg font-bold mb-1">{post.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; 2026 Conduit by DigitalHustle</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/changelog" className="hover:text-foreground transition-colors">Changelog</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
