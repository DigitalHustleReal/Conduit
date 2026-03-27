'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const AGENTS = [
  { name: 'Content Autopilot', icon: '\u{1F680}', type: 'AI', desc: 'Generates full articles from keywords', status: 'Running...' },
  { name: 'SEO Guardian', icon: '\u{1F6E1}', type: 'Hybrid', desc: 'Monitors and fixes SEO issues', status: 'Last run: 2m ago' },
  { name: 'Keyword Opportunity', icon: '\u{1F50D}', type: 'AI', desc: 'Discovers high-value keywords', status: 'Last run: 5m ago' },
  { name: 'Pipeline Manager', icon: '\u{1F4CB}', type: 'Heuristic', desc: 'Keeps content workflow on track', status: 'Running...' },
  { name: 'Health Monitor', icon: '\u{1F3E5}', type: 'Heuristic', desc: 'Checks content health every 10 min', status: 'Last run: 1m ago' },
  { name: 'Content Refresh', icon: '\u{267B}', type: 'AI', desc: 'Updates stale content automatically', status: 'Last run: 12m ago' },
  { name: 'Interlink Builder', icon: '\u{1F517}', type: 'AI', desc: 'Builds internal link network', status: 'Last run: 8m ago' },
  { name: 'Smart Onboarding', icon: '\u{2728}', type: 'AI', desc: 'Guides new users to first publish', status: 'Last run: 3m ago' },
];

const PRICING = [
  { plan: 'Free', price: '$0', period: '/forever', calls: '100 AI calls/mo', features: ['5 articles', '1 team member', 'Basic agents', 'Community support'], cta: 'Start Free', highlight: false, byok: false },
  { plan: 'Pro', price: '$29', period: '/month', calls: '1,000 AI calls/mo', features: ['Unlimited articles', '5 team members', 'All 113 agents', 'Priority support', 'API access', 'Version history'], cta: 'Start Pro', highlight: true, byok: false },
  { plan: 'Business', price: '$99', period: '/month', calls: '10,000 AI calls/mo', features: ['Unlimited everything', '15 team members', 'White-label', 'Dedicated support', 'Custom integrations', 'SSO'], cta: 'Start Business', highlight: false, byok: false },
  { plan: 'BYOK', price: '$0', period: '/forever', calls: 'Unlimited (your keys)', features: ['Bring your own API keys', 'Unlimited AI calls', 'All features unlocked', 'Self-serve setup'], cta: 'Get Started', highlight: false, byok: true },
];

const FAQ = [
  { q: 'What is Conduit?', a: 'Conduit is an AI-native content operations platform. It combines a full CMS with 113 autonomous AI agents that handle everything from keyword research to publishing.' },
  { q: 'Do I need my own AI API keys?', a: 'No. Free, Pro, and Business plans include AI credits. But if you have your own API keys from OpenAI, Anthropic, Google, Mistral, or Groq, you can use them with the BYOK plan for unlimited calls.' },
  { q: 'How is this different from Jasper or Copy.ai?', a: 'Those are AI text generators. Conduit is a complete content operations platform with CMS, pipeline management, SEO scoring, autonomous agents, and publishing workflows.' },
  { q: 'Can I use Conduit as a headless CMS?', a: 'Yes. Conduit exposes REST APIs for all content, collections, and schemas. You can use it with any frontend framework.' },
  { q: 'What AI models do you support?', a: 'Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google), Mistral, and Groq. You can switch providers per workspace.' },
  { q: 'Is there a free trial?', a: 'The Free plan is free forever with 100 AI calls per month. No credit card required.' },
];

const USE_CASES: Record<string, { title: string; points: string[] }> = {
  solo: { title: 'Solo Creators', points: ['Scale from 1 to 100+ articles/month', 'Content Autopilot writes while you strategize', 'One-person team with the output of ten'] },
  agency: { title: 'Agencies', points: ['Manage 5-20 client sites from one dashboard', 'White-label Conduit under your brand', 'Team roles: Admin, Editor, Writer'] },
  niche: { title: 'Niche Sites', points: ['Programmatic SEO at scale', 'Bulk generate with AI agents', 'Auto interlink across 1,000+ pages'] },
};

/* ------------------------------------------------------------------ */
/*  Scroll-reveal hook                                                 */
/* ------------------------------------------------------------------ */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, cls: visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6' };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('solo');

  /* scroll-reveal refs for each section */
  const r1 = useReveal(); const r2 = useReveal(); const r3 = useReveal();
  const r4 = useReveal(); const r5 = useReveal(); const r6 = useReveal();
  const r7 = useReveal(); const r8 = useReveal(); const r9 = useReveal();

  /* nav background on scroll */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const smoothScroll = useCallback((id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* ---- inline keyframes ---- */}
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes glow-pulse{0%,100%{opacity:.45}50%{opacity:.75}}
        .anim-float{animation:float 6s ease-in-out infinite}
        .anim-glow{animation:glow-pulse 4s ease-in-out infinite}
        .reveal-base{transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
      `}</style>

      {/* ========== 1. STICKY NAV ========== */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/50 shadow-lg shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <a href="#" className="text-xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Conduit</a>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" onClick={smoothScroll('features')} className="text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#agents" onClick={smoothScroll('agents')} className="text-zinc-400 hover:text-white transition-colors">Agents</a>
            <a href="#pricing" onClick={smoothScroll('pricing')} className="text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <a href="#faq" onClick={smoothScroll('faq')} className="text-zinc-400 hover:text-white transition-colors">FAQ</a>
          </div>
          <Link href="/dashboard">
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-shadow border-0">Open App</Button>
          </Link>
        </div>
      </nav>

      {/* ========== 2. HERO ========== */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* bg glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/15 rounded-full blur-[120px] anim-glow pointer-events-none" />

        <div ref={r1.ref} className={`reveal-base ${r1.cls} max-w-4xl mx-auto text-center relative z-10`}>
          <Badge variant="outline" className="mb-6 text-violet-300 border-violet-400/30 bg-violet-500/10 px-4 py-1 text-xs tracking-wide">
            <span className="mr-1.5 text-violet-400">{'\u2726'}</span>Now in public beta &mdash; Start free today
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.08] tracking-tight mb-6">
            Your AI Content Team.<br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">113 Agents. Zero Hiring.</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The first platform where AI agents handle content operations end-to-end&mdash;from keyword research to publishing to performance monitoring.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto px-8 bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-xl shadow-violet-600/25 hover:shadow-violet-600/40 transition-all border-0 text-sm font-semibold">
                Start Free &mdash; No Card Required
              </Button>
            </Link>
            <a href="#features" onClick={smoothScroll('features')}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-all text-sm">
                Watch Demo &rarr;
              </Button>
            </a>
          </div>

          <p className="text-xs text-zinc-500 mt-5 tracking-wide">Free forever &bull; No credit card &bull; 100 AI calls/month</p>

          {/* Fake dashboard preview */}
          <div className="mt-16 mx-auto max-w-3xl border border-zinc-700/50 rounded-xl overflow-hidden shadow-2xl shadow-violet-500/10 bg-zinc-900/80 backdrop-blur" style={{ transform: 'perspective(1200px) rotateX(2deg)' }}>
            {/* topbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800/80">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-zinc-500 font-mono">conduit &mdash; dashboard</span>
            </div>
            {/* stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6">
              {[
                { label: 'Published', val: '47', color: 'text-emerald-400' },
                { label: 'Drafts', val: '12', color: 'text-amber-400' },
                { label: 'AI Score', val: '94', color: 'text-violet-400' },
                { label: 'Agents Active', val: '8', color: 'text-cyan-400' },
              ].map(s => (
                <div key={s.label} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/30">
                  <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== 3. METRICS BAR ========== */}
      <section ref={r2.ref} className={`reveal-base ${r2.cls} bg-zinc-900/60 border-y border-zinc-800/50 py-12 px-6`}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '113', label: 'AI Agents' },
            { num: '21', label: 'AI Tools' },
            { num: '5', label: 'AI Providers' },
            { num: '$0', label: 'To Start' },
          ].map(m => (
            <div key={m.label}>
              <p className="text-4xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{m.num}</p>
              <p className="text-sm text-zinc-400 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== 4. FEATURES ========== */}
      <section id="features" className="py-24 px-6">
        <div ref={r3.ref} className={`reveal-base ${r3.cls} max-w-6xl mx-auto`}>
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Everything you need to scale content</h2>
            <div className="mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" />
          </div>

          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <Badge className="mb-4 bg-violet-500/10 text-violet-400 border-violet-500/20">Core Platform</Badge>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">113 Autonomous AI Agents</h3>
              <p className="text-zinc-400 leading-relaxed mb-6">Deploy AI agents that work around the clock. They monitor your content, fix SEO issues, discover keywords, build internal links, and keep your pipeline moving&mdash;all without human intervention.</p>
              <ul className="space-y-3 text-sm text-zinc-300">
                {['Work 24/7 without breaks or supervision', 'Heuristic + AI hybrid intelligence', 'Auto-fix SEO issues as they appear', 'Scale from 8 core agents to 113 micro-agents'].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">{'\u2713'}</span>{b}</li>
                ))}
              </ul>
            </div>
            <div className="border border-violet-500/20 rounded-xl bg-zinc-900/60 p-6 backdrop-blur shadow-lg shadow-violet-500/5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-sm">Agent: SEO Guardian</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Running</span>
              </div>
              <div className="space-y-3 text-sm">
                {[['Last Fix', '2 min ago'], ['Issues Fixed', '47'], ['Uptime', '99.8%'], ['Next Scan', '38s']].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-zinc-800/50 pb-2">
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-zinc-200 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 md:order-1 bg-zinc-900/60 rounded-xl p-6 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 mb-4 font-medium tracking-wide uppercase">AI Studio</p>
              <div className="grid grid-cols-3 gap-2">
                {['Title Gen', 'Meta Desc', 'Outline', 'Rewrite', 'Translate', 'Social Brief', 'Expand', 'Summarize', 'Tone Shift'].map(t => (
                  <div key={t} className="bg-zinc-800/70 rounded-lg px-3 py-2.5 text-xs text-zinc-300 text-center border border-zinc-700/30 hover:border-violet-500/30 hover:bg-violet-500/5 transition-colors cursor-default">{t}</div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">AI Studio</Badge>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">21 Professional AI Tools</h3>
              <p className="text-zinc-400 leading-relaxed mb-6">A complete toolkit for every content task. Generate titles, meta descriptions, outlines, rewrites, translations, and social briefs&mdash;powered by your choice of 5 AI providers.</p>
              <ul className="space-y-3 text-sm text-zinc-300">
                {['Switch between Claude, GPT-4, Gemini, Mistral, Groq', 'Pinned favorites for instant access', 'Prompt library with 33 built-in templates'].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">{'\u2713'}</span>{b}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">API-First</Badge>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Headless CMS + Any Frontend</h3>
              <p className="text-zinc-400 leading-relaxed mb-6">Conduit exposes REST endpoints for all content, collections, and schemas. Connect any frontend&mdash;Next.js, Astro, Remix, or your custom stack.</p>
              <ul className="space-y-3 text-sm text-zinc-300">
                {['Full REST API with authentication', 'Collections, schemas, versioning out of the box', 'Webhooks for real-time event streaming'].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">{'\u2713'}</span>{b}</li>
                ))}
              </ul>
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800/50 overflow-hidden font-mono text-sm">
              <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-800/50 text-xs text-zinc-500">api-example.ts</div>
              <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed"><code>{`const client = `}<span className="text-violet-400">new</span>{` ConduitClient({
  url: `}<span className="text-emerald-400">{`'https://api.conduit.io'`}</span>{`,
  key: `}<span className="text-emerald-400">{`'ck_live_...'`}</span>{`
});

const articles = `}<span className="text-violet-400">await</span>{` client.getContent({
  collection: `}<span className="text-emerald-400">{`'blog'`}</span>{`,
  limit: `}<span className="text-amber-400">10</span>{`
});`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 5. AGENT SHOWCASE ========== */}
      <section id="agents" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-600/[0.03] to-transparent pointer-events-none" />
        <div ref={r4.ref} className={`reveal-base ${r4.cls} max-w-6xl mx-auto relative z-10`}>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">8 Agents Working While You Sleep</h2>
            <p className="text-zinc-400 text-lg">Plus 105 micro-agents for specialized tasks</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENTS.map(a => (
              <div key={a.name} className="group bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 hover:-translate-y-1 cursor-default">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{a.icon}</span>
                  <Badge variant="outline" className={`text-[10px] ${a.type === 'AI' ? 'text-violet-400 border-violet-500/30' : a.type === 'Hybrid' ? 'text-cyan-400 border-cyan-500/30' : 'text-amber-400 border-amber-500/30'}`}>{a.type}</Badge>
                </div>
                <h4 className="font-semibold text-sm mb-1">{a.name}</h4>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{a.desc}</p>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${a.status.startsWith('Running') ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                  <span className="text-zinc-500">{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 6. BEFORE / AFTER ========== */}
      <section className="py-24 px-6">
        <div ref={r5.ref} className={`reveal-base ${r5.cls} max-w-5xl mx-auto`}>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-16">The old way vs. Conduit</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* OLD WAY */}
            <div className="bg-red-500/[0.04] border border-red-500/10 rounded-xl p-6">
              <p className="text-sm font-semibold text-red-400 mb-5 tracking-wide uppercase">The old way</p>
              <ul className="space-y-3 text-sm text-zinc-300">
                {[
                  'WordPress + 15 plugins ($50+/mo)',
                  'Ahrefs for keywords ($99/mo)',
                  'Jasper for AI writing ($49/mo)',
                  'Notion for pipeline (free but slow)',
                  'Manual SEO checks (hours/week)',
                  'No automation whatsoever',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2"><span className="text-red-400/80 mt-0.5 shrink-0">{'\u2718'}</span>{item}</li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-red-500/10 text-xs text-zinc-500">
                <span className="text-red-400 font-bold">$198+/month</span> &bull; 5 tools &bull; 20+ hours/week
              </div>
            </div>

            {/* CONDUIT */}
            <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl p-6">
              <p className="text-sm font-semibold text-emerald-400 mb-5 tracking-wide uppercase">With Conduit</p>
              <ul className="space-y-3 text-sm text-zinc-300">
                {[
                  'Full CMS + AI + SEO + Pipeline',
                  '113 agents handle everything',
                  'One dashboard, zero plugins',
                  'Autonomous \u2014 runs while you sleep',
                  '5 AI providers built in',
                  'BYOK = free forever',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5 shrink-0">{'\u2713'}</span>{item}</li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-emerald-500/10 text-xs text-zinc-500">
                <span className="text-emerald-400 font-bold">$0-29/month</span> &bull; 1 tool &bull; 2 hours/week
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 7. USE CASES ========== */}
      <section className="py-24 px-6 border-t border-zinc-800/50">
        <div ref={r6.ref} className={`reveal-base ${r6.cls} max-w-3xl mx-auto`}>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-10">Built for how you work</h2>

          <div className="flex justify-center gap-2 mb-10">
            {Object.entries(USE_CASES).map(([key, val]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'}`}>
                {val.title}
              </button>
            ))}
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-8">
            <h3 className="font-bold text-lg mb-4">{USE_CASES[activeTab].title}</h3>
            <ul className="space-y-4">
              {USE_CASES[activeTab].points.map(p => (
                <li key={p} className="flex items-start gap-3 text-zinc-300">
                  <span className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs text-violet-400 shrink-0 mt-0.5">{'\u2713'}</span>
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ========== 8. PRICING ========== */}
      <section id="pricing" className="py-24 px-6">
        <div ref={r7.ref} className={`reveal-base ${r7.cls} max-w-6xl mx-auto`}>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Start free. Scale when ready.</h2>
            <p className="text-zinc-400 text-lg">No surprises. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PRICING.map(p => (
              <div key={p.plan}
                className={`relative rounded-xl p-6 transition-all ${
                  p.highlight
                    ? 'bg-gradient-to-b from-violet-500/10 to-zinc-900 border-2 border-violet-500/40 shadow-xl shadow-violet-500/10 lg:-mt-4 lg:mb-4 lg:py-8'
                    : p.byok
                      ? 'bg-zinc-900/40 border-2 border-dashed border-zinc-700/50'
                      : 'bg-zinc-900/60 border border-zinc-800/50'
                }`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600 text-white text-[10px] px-3 shadow-lg shadow-violet-600/30 border-0">MOST POPULAR</Badge>
                  </div>
                )}
                {p.byok && <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Power Users</p>}

                <h3 className="font-bold text-lg">{p.plan}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-black">{p.price}</span>
                  <span className="text-zinc-500 text-sm">{p.period}</span>
                </div>
                <p className="text-xs text-zinc-400 mb-5">{p.calls}</p>

                <ul className="space-y-2.5 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="text-sm text-zinc-300 flex items-center gap-2">
                      <span className="text-emerald-400 text-xs">{'\u2713'}</span>{f}
                    </li>
                  ))}
                </ul>

                <Link href="/dashboard" className="block">
                  <Button variant={p.highlight ? 'default' : 'outline'} className={`w-full ${p.highlight ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-600/20 border-0' : ''}`} size="sm">{p.cta}</Button>
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-zinc-500 mt-10">All plans include: Unlimited collections &bull; Version history &bull; REST API &bull; 5 AI providers</p>
        </div>
      </section>

      {/* ========== 9. FAQ ========== */}
      <section id="faq" className="py-24 px-6 border-t border-zinc-800/50">
        <div ref={r8.ref} className={`reveal-base ${r8.cls} max-w-3xl mx-auto`}>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-12">Questions? We&apos;ve got answers.</h2>

          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-zinc-800/50 rounded-lg overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                  <span className="font-medium text-sm">{item.q}</span>
                  <svg className={`w-4 h-4 text-zinc-500 transition-transform duration-200 shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: openFaq === i ? '200px' : '0px' }}>
                  <div className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 10. FINAL CTA ========== */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[300px] bg-violet-600/10 rounded-full blur-[100px] anim-glow" />
        </div>
        <div ref={r9.ref} className={`reveal-base ${r9.cls} max-w-2xl mx-auto text-center relative z-10`}>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Stop managing tools.<br />Start managing strategy.</h2>
          <p className="text-zinc-400 text-lg mb-8">Free forever. No credit card. 113 agents ready to work.</p>
          <Link href="/dashboard">
            <Button size="lg" className="px-10 bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-xl shadow-violet-600/25 hover:shadow-violet-600/40 transition-all border-0 font-semibold">
              Get Started Free &rarr;
            </Button>
          </Link>
          <p className="text-xs text-zinc-500 mt-5">Join 500+ content creators already using Conduit</p>
        </div>
      </section>

      {/* ========== 11. FOOTER ========== */}
      <footer className="border-t border-zinc-800/50 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <p className="font-semibold text-sm mb-4 text-zinc-200">Product</p>
              <ul className="space-y-2.5 text-sm text-zinc-500">
                {['Features', 'Pricing', 'API Docs', 'Changelog'].map(l => <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4 text-zinc-200">Resources</p>
              <ul className="space-y-2.5 text-sm text-zinc-500">
                {['Blog', 'Documentation', 'Help Center', 'Status'].map(l => <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4 text-zinc-200">Company</p>
              <ul className="space-y-2.5 text-sm text-zinc-500">
                {['About', 'Careers', 'Contact', 'Press'].map(l => <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4 text-zinc-200">Legal</p>
              <ul className="space-y-2.5 text-sm text-zinc-500">
                {['Privacy', 'Terms', 'Security'].map(l => <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-zinc-800/50 gap-4">
            <p className="text-xs text-zinc-500">&copy; 2026 Conduit. AI-native content operations.</p>
            <div className="flex gap-4">
              {['X', 'GH', 'LI', 'YT'].map(s => (
                <a key={s} href="#" className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-[10px] text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-colors font-mono">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
