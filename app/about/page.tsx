import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — Conduit',
  description: 'Conduit is the AI-native content operations platform. Built by DigitalHustle to give every creator the power of a 10-person content team.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Conduit</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black mb-6">About Conduit</h1>

        {/* Mission */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-xl text-muted-foreground leading-relaxed border-l-4 border-primary pl-5 py-2">
            Give every content creator the power of a 10-person content team through autonomous AI agents, without requiring enterprise budgets or technical expertise.
          </p>
        </section>

        {/* Vision */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
          <p className="text-muted-foreground leading-relaxed">
            Conduit is the operating system for content-first businesses. Not another SEO tool. Not another CMS. The first platform where AI agents handle content operations end-to-end &mdash; from keyword research to publishing to performance monitoring &mdash; while humans make strategic decisions.
          </p>
        </section>

        {/* What makes us different */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">What Makes Conduit Different</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-bold mb-2">AI-Native, Not AI-Bolted</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI is not a feature we added to a CMS. It is the foundation. Every part of Conduit is designed around autonomous agents that work while you sleep.
              </p>
            </div>
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-bold mb-2">Full Content Operations</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                From keyword research to content creation to SEO optimization to publishing to performance monitoring. One platform replaces a stack of 5-10 tools.
              </p>
            </div>
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-bold mb-2">You Own Everything</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All content you create &mdash; including AI-generated content &mdash; is yours. Export anytime. Use our headless CMS API. No lock-in.
              </p>
            </div>
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-bold mb-2">Bring Your Own Keys</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use your own API keys from 5 AI providers for unlimited calls at zero platform cost. Anthropic, OpenAI, Google, Mistral, Groq &mdash; your choice.
              </p>
            </div>
          </div>
        </section>

        {/* Built by */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Built by DigitalHustle</h2>
          <p className="text-muted-foreground leading-relaxed">
            Conduit is built by DigitalHustle, a small team focused on building tools that make content creators more productive. We believe the future of content is autonomous &mdash; AI agents handling the repetitive work while humans focus on strategy, creativity, and audience connection.
          </p>
        </section>

        {/* Open source */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Open Source</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Conduit is open source. You can view the code, contribute, report bugs, and suggest features on GitHub.
          </p>
          <a
            href="https://github.com/digitalhustle/conduit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-card transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            View on GitHub
          </a>
        </section>

        {/* Roadmap */}
        <section>
          <h2 className="text-2xl font-bold mb-4">We&apos;re Just Getting Started</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Conduit 1.0 is live, but there is much more to come. Here is what we are working on next:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            {[
              'Google Search Console API — real ranking data in Analytics',
              '100+ micro-agents — specific task agents for every content operation',
              'Meta-agents — agents that monitor and optimize other agents',
              'Social distribution — auto-post to LinkedIn/Twitter on publish',
              'Schema markup generator — auto JSON-LD for all content types',
              'PageSpeed Insights — Core Web Vitals in Analytics',
              'Readability scoring — Flesch-Kincaid algorithm (local, no API)',
              'White-label mode — custom branding per workspace',
              'Marketplace — premium prompts, agent templates, schemas',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed">
                <span className="text-primary shrink-0">&#8594;</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; 2026 Conduit by DigitalHustle</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
