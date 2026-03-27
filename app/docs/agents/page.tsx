import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Agent Documentation — Conduit',
  description: 'How Conduit autonomous AI agents work: hierarchy, tiers, triggers, credits, and autopilot mode.',
};

const CORE_AGENTS = [
  { name: 'Content Autopilot', type: 'AI + Manual', interval: 'On demand', credits: '~5/article', desc: 'Generates full articles from keywords. Takes a keyword, researches intent, outlines, writes, scores SEO, and queues for review.' },
  { name: 'SEO Guardian', type: 'Hybrid', interval: '5 min', credits: '0 scan / 1 fix', desc: 'Continuously monitors content SEO health. Runs heuristic scans for free, uses AI credits only when auto-fixing issues.' },
  { name: 'Keyword Opportunity', type: 'AI', interval: 'On demand', credits: '1/run', desc: 'Analyzes your content gaps and suggests high-value keyword opportunities based on your niche and existing content.' },
  { name: 'Pipeline Manager', type: 'Heuristic', interval: '2 min', credits: '0', desc: 'Keeps content workflow on track. Monitors pipeline stages, flags bottlenecks, and auto-moves content through review stages.' },
  { name: 'Smart Onboarding', type: 'AI', interval: 'One-time', credits: '~3', desc: 'Guides new users through setup. Auto-triggers when workspace is empty. Creates sample collection, content, and pipeline.' },
  { name: 'Health Monitor', type: 'Heuristic', interval: '10 min', credits: '0', desc: 'Checks overall workspace health: broken links, stale content, missing metadata, orphan pages, and performance metrics.' },
  { name: 'Content Refresh', type: 'AI', interval: 'On demand', credits: '1/article', desc: 'Identifies outdated content and rewrites sections to keep articles current. Preserves SEO value while updating facts.' },
  { name: 'Interlink Builder', type: 'AI', interval: 'On demand', credits: '1/run', desc: 'Analyzes your content network, detects orphan pages, and suggests internal links to improve site structure and SEO.' },
];

const MICRO_AGENT_CATEGORIES = [
  { category: 'Writing', count: 28, examples: ['Blog Post Writer', 'Product Description', 'Email Newsletter', 'Landing Page Copy', 'Social Caption'] },
  { category: 'SEO', count: 22, examples: ['Meta Title Optimizer', 'Schema Generator', 'Keyword Clusterer', 'Readability Scorer', 'Alt Text Writer'] },
  { category: 'Research', count: 18, examples: ['Competitor Analyzer', 'Topic Explorer', 'Trend Detector', 'SERP Analyzer', 'Content Gap Finder'] },
  { category: 'Editing', count: 15, examples: ['Grammar Checker', 'Tone Adjuster', 'Headline Scorer', 'CTA Optimizer', 'Fact Checker'] },
  { category: 'Distribution', count: 12, examples: ['Tweet Thread', 'LinkedIn Post', 'Pinterest Pin', 'Newsletter Digest', 'RSS Summary'] },
  { category: 'Analytics', count: 8, examples: ['Performance Reporter', 'Traffic Predictor', 'Engagement Scorer', 'ROI Calculator'] },
];

const EVENTS = [
  { event: 'content.created', desc: 'Fires when a new content item is created' },
  { event: 'content.updated', desc: 'Fires when content is modified' },
  { event: 'content.published', desc: 'Fires when content status changes to published' },
  { event: 'content.deleted', desc: 'Fires when content is removed' },
  { event: 'keyword.added', desc: 'Fires when a keyword is added to the workspace' },
  { event: 'pipeline.moved', desc: 'Fires when content moves between pipeline stages' },
  { event: 'agent.completed', desc: 'Fires when an agent finishes a task' },
  { event: 'score.changed', desc: 'Fires when SEO or AI score is recalculated' },
];

export default function AgentDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold tracking-tight">Conduit</Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
          </div>
          <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; All docs</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black mb-3">AI Agents</h1>
        <p className="text-lg text-muted-foreground mb-12">
          Conduit&apos;s agent system is a hierarchy of autonomous workers that handle content operations without manual intervention.
        </p>

        {/* Agent hierarchy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Agent Hierarchy</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-primary/30 bg-primary/5 rounded-lg p-5">
              <div className="text-sm font-mono text-primary mb-2">Level 1</div>
              <h3 className="font-bold text-lg mb-2">Conductor</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The master orchestrator. Monitors all agents, allocates credit budgets, resolves conflicts, and makes strategic decisions about what to prioritize.
              </p>
            </div>
            <div className="border border-border rounded-lg p-5">
              <div className="text-sm font-mono text-muted-foreground mb-2">Level 2</div>
              <h3 className="font-bold text-lg mb-2">Directors</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Domain specialists. The 8 core agents each manage a specific area: content creation, SEO, keywords, pipeline, onboarding, health, refresh, and interlinking.
              </p>
            </div>
            <div className="border border-border rounded-lg p-5">
              <div className="text-sm font-mono text-muted-foreground mb-2">Level 3</div>
              <h3 className="font-bold text-lg mb-2">Workers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                113 micro-agents that handle specific tasks. Each worker is triggered by events or director commands and executes a single, focused operation.
              </p>
            </div>
          </div>
        </section>

        {/* 8 Core Agents */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">8 Core Agents (Directors)</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Agent</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Interval</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Credits</th>
                </tr>
              </thead>
              <tbody>
                {CORE_AGENTS.map((a) => (
                  <tr key={a.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.interval}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-4">
            {CORE_AGENTS.map((a) => (
              <div key={a.name} className="border border-border rounded-lg p-4">
                <h3 className="font-bold mb-1">{a.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Micro agents */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Micro-Agents (Workers)</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            113 specialized micro-agents organized by category. Each consumes 1 AI credit per execution unless noted otherwise.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {MICRO_AGENT_CATEGORIES.map((cat) => (
              <div key={cat.category} className="border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">{cat.category}</h3>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">{cat.count} agents</span>
                </div>
                <p className="text-xs text-muted-foreground">{cat.examples.join(', ')}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Agent tiers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Agent Tiers</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-bold mb-2">Heuristic (Free)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Rule-based agents that use no AI credits. Pipeline Manager, Health Monitor, and SEO Guardian scans are all heuristic.
              </p>
            </div>
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-bold mb-2">AI (1 credit)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Single AI call per execution. Most micro-agents, keyword discovery, and interlink suggestions.
              </p>
            </div>
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-bold mb-2">Multi-step (3-5 credits)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Complex operations requiring multiple AI calls. Content Autopilot and Smart Onboarding.
              </p>
            </div>
          </div>
        </section>

        {/* Autopilot */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Autopilot Mode</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Autopilot lets agents run continuously without manual triggers. Configure a daily credit budget and schedule, and agents will work within those limits.
          </p>
          <div className="border border-border rounded-lg p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded shrink-0">Budget</span>
              <p className="text-sm text-muted-foreground">Set a daily credit limit (e.g., 50 credits/day). Agents stop when the budget is exhausted.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded shrink-0">Schedule</span>
              <p className="text-sm text-muted-foreground">Define active hours (e.g., 9am-5pm). Agents only run during scheduled windows.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded shrink-0">Priority</span>
              <p className="text-sm text-muted-foreground">Agents are prioritized: SEO fixes first, then keyword opportunities, then content refresh.</p>
            </div>
          </div>
        </section>

        {/* Events */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Event System</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Agents respond to events in the workspace. Events can trigger one or more agents, and can also fire webhooks.
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((e) => (
                  <tr key={e.event} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{e.event}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Credit table */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Credit Consumption</h2>
          <div className="border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Credits are consumed only by AI-powered agents. Heuristic agents run for free.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex justify-between"><span>Heuristic scan (SEO Guardian, Pipeline, Health)</span><span className="font-mono">0 credits</span></li>
              <li className="flex justify-between"><span>Single AI micro-agent</span><span className="font-mono">1 credit</span></li>
              <li className="flex justify-between"><span>AI fix (SEO Guardian auto-fix)</span><span className="font-mono">1 credit</span></li>
              <li className="flex justify-between"><span>Keyword Opportunity / Interlink Builder</span><span className="font-mono">1 credit</span></li>
              <li className="flex justify-between"><span>Content Refresh (per article)</span><span className="font-mono">1 credit</span></li>
              <li className="flex justify-between"><span>Smart Onboarding (one-time)</span><span className="font-mono">~3 credits</span></li>
              <li className="flex justify-between"><span>Content Autopilot (full article)</span><span className="font-mono">~5 credits</span></li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; 2026 Conduit by DigitalHustle</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="/docs/api" className="hover:text-foreground transition-colors">API</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
